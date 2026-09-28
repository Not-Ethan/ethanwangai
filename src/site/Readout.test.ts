import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { copy } from '@/site/copy';
import { READOUT_MARGIN, READOUT_OFFSET, Readout, createReadoutSync, readoutText } from './Readout';

const quote = { machine: 0, col: 23, x: 300, y: 200, mid: 24, bid: 21, ask: 26, fills: 3 };

/** A stand-in for #readout that counts every write, so the test can hold the sync to "only what changed". */
function fakeEl() {
  const writes = { hidden: 0, text: 0, transform: 0 };
  const state = { hidden: true, text: '', transform: '' };
  const el = {
    get hidden() { return state.hidden; }, set hidden(v: boolean) { writes.hidden++; state.hidden = v; },
    get textContent() { return state.text; }, set textContent(v: string) { writes.text++; state.text = v; },
    style: {
      get transform() { return state.transform; }, set transform(v: string) { writes.transform++; state.transform = v; },
    },
  };
  return { el: el as unknown as HTMLElement, state, writes };
}

describe('readoutText', () => {
  it("prints the machine's own numbers under copy.kalshi.readout's labels: market 23 · bid 21 · ask 26 · fills 3", () => {
    expect(readoutText(quote)).toBe('market 23 · bid 21 · ask 26 · fills 3');
    const r = copy.kalshi.readout;
    expect(readoutText(quote)).toBe(`${r.market} 23 · ${r.bid} 21 · ${r.ask} 26 · ${r.fills} 3`);
  });
});

describe('<Readout />', () => {
  const html = renderToStaticMarkup(createElement(Readout));
  it('is one fixed, hidden mono element #readout that never takes the pointer', () => {
    expect(html).toMatch(/^<div [^>]*id="readout"/);
    expect(html).toMatch(/\bhidden=""/);
    const cls = /class="([^"]*)"/.exec(html)?.[1] ?? '';
    for (const c of ['mono', 'fixed', 'left-0', 'top-0', 'pointer-events-none']) expect(cls.split(' ')).toContain(c);
    expect(html).not.toMatch(/shadow|backdrop/);
  });
});

describe('createReadoutSync', () => {
  it('shows #readout 14 px below and right of the pointer with the quote, and hides it when no machine is hovered', () => {
    const { el, state } = fakeEl();
    const sync = createReadoutSync(el);
    sync({ ...quote, machine: -1 });
    expect(state.hidden).toBe(true);
    sync(quote);
    expect(READOUT_OFFSET).toBe(14);
    expect(state.hidden).toBe(false);
    expect(state.text).toBe('market 23 · bid 21 · ask 26 · fills 3');
    expect(state.transform).toBe(`translate3d(min(314px, 100vw - 100% - ${READOUT_MARGIN}px), min(214px, 100vh - 100% - ${READOUT_MARGIN}px), 0)`);
    sync({ ...quote, machine: -1 });
    expect(state.hidden).toBe(true);
  });

  it('keeps the whole line on screen: past the right or bottom edge it stops a 16 px gutter short, measured by CSS, not by a layout read', () => {
    const { el, state } = fakeEl();
    createReadoutSync(el)({ ...quote, x: 1400, y: 880 });
    expect(READOUT_MARGIN).toBe(16);
    // min() of the pointer offset and the viewport less the readout's own size (100% of a translate is the element's box)
    expect(state.transform).toBe('translate3d(min(1414px, 100vw - 100% - 16px), min(894px, 100vh - 100% - 16px), 0)');
  });

  it('writes only what changed: a still frame touches nothing, a new quote only the text, a move only the transform', () => {
    const { el, writes } = fakeEl();
    const sync = createReadoutSync(el);
    sync(quote);
    const first = { ...writes };
    sync(quote);
    expect(writes).toEqual(first);
    sync({ ...quote, fills: 4 });
    expect(writes).toEqual({ ...first, text: first.text + 1 });
    sync({ ...quote, fills: 4, x: 301 });
    expect(writes).toEqual({ ...first, text: first.text + 1, transform: first.transform + 1 });
  });

  it('does not write text or position while hidden', () => {
    const { el, writes } = fakeEl();
    const sync = createReadoutSync(el);
    sync({ ...quote, machine: -1 });
    sync({ ...quote, machine: -1, col: 40, x: 10 });
    expect(writes.text).toBe(0);
    expect(writes.transform).toBe(0);
  });

  it('is a no-op without the element', () => {
    expect(() => createReadoutSync(null)(quote)).not.toThrow();
  });
});
