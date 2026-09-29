import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copy } from '@/site/copy';
import { facts } from '@/site/facts';
import { planVisitor } from '@/gl/visitor';
import { clearSentence, mailtoHref, submitSentence, type YoursDom } from './Yours';

/** The plate a sentence should print, from the layout itself. */
function plateFor(text: string): string {
  const plan = planVisitor(text, 'desktop')!;
  return copy.yours.plate(plan.words, plan.sentences, plan.result.counts.total);
}

// The section's handlers against plain stand-ins for its nodes: node has no DOM, and the handlers only ever set
// value, textContent and href, so a stand-in that has nothing else (no innerHTML) shows the sentence stays text.
function fakeDom(value: string) {
  const blur = vi.fn();
  const dom: YoursDom = { input: { value, blur }, echo: { textContent: '' }, plate: { textContent: copy.yours.plateEmpty }, mailto: { href: mailtoHref('') } };
  return { dom, blur };
}

let events: { type: string; detail: unknown }[] = [];
beforeEach(() => {
  events = [];
  const win = new EventTarget();
  for (const type of ['dbso:visitor:build', 'dbso:visitor:clear']) win.addEventListener(type, (e) => events.push({ type, detail: (e as CustomEvent).detail }));
  vi.stubGlobal('window', win);
});
afterEach(() => vi.unstubAllGlobals());

describe('mailtoHref', () => {
  it('prefills the typed sentence as the subject, encoded, and says hi when there is none', () => {
    expect(mailtoHref('')).toBe(`mailto:${facts.links.email}?subject=${encodeURIComponent('hi ethan')}`);
    const href = mailtoHref('a bot & a bar? #1');
    expect(href).toBe(`mailto:${facts.links.email}?subject=${encodeURIComponent(copy.yours.mailSubject('a bot & a bar? #1'))}`);
    expect(new URL(href).searchParams.get('subject')).toBe('i want to build: a bot & a bar? #1');
  });
});

describe('submitSentence', () => {
  it('Enter: the trimmed sentence goes to the echo, the scene and the subject, and the plate prints the layout\'s counts', async () => {
    const { dom, blur } = fakeDom('  build a thing that runs. then another.  ');
    const scrollTo = vi.fn();
    const done = submitSentence(dom, 'desktop', scrollTo);
    const text = 'build a thing that runs. then another.';
    expect(dom.echo.textContent).toBe(text);
    expect(events).toEqual([{ type: 'dbso:visitor:build', detail: { text } }]);
    expect(dom.mailto.href).toBe(mailtoHref(text));
    await done;
    expect(dom.plate.textContent).toBe('fig. 5 — yours. 7 words, 2 sentences. 12 parts.');
    expect(blur).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(dom.input.value).toBe('  build a thing that runs. then another.  ');   // the input keeps what was typed
  });

  it('keeps markup as text: the echo holds the characters typed', async () => {
    const { dom } = fakeDom('<img src=x onerror=alert(1)> builds.');
    await submitSentence(dom, 'desktop', () => {});
    expect(dom.echo.textContent).toBe('<img src=x onerror=alert(1)> builds.');
    expect(dom.plate.textContent).toBe(plateFor('<img src=x onerror=alert(1)> builds.'));
  });

  it('on phones closes the keyboard and reframes the page on the slot', async () => {
    const { dom, blur } = fakeDom('a thing.');
    const scrollTo = vi.fn();
    await submitSentence(dom, 'phone', scrollTo);
    expect(blur).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith('yours');
  });

  it('an empty or blank Enter clears instead of building', async () => {
    for (const value of ['', '   ']) {
      events = [];
      const { dom } = fakeDom(value);
      dom.echo.textContent = 'an earlier sentence.';
      dom.plate.textContent = 'fig. 5 — yours. 3 words, 1 sentence. 7 parts.';
      await submitSentence(dom, 'desktop', () => {});
      expect(events).toEqual([{ type: 'dbso:visitor:clear', detail: null }]);
      expect(dom.echo.textContent).toBe('');
      expect(dom.plate.textContent).toBe(copy.yours.plateEmpty);
    }
  });

  it('a clear before the layout lands leaves the plate empty, and a later sentence is not overwritten by an earlier one', async () => {
    const { dom } = fakeDom('one sentence.');
    const first = submitSentence(dom, 'desktop', () => {});
    clearSentence(dom);
    await first;
    expect(dom.plate.textContent).toBe(copy.yours.plateEmpty);
    dom.input.value = 'the first one.';
    const a = submitSentence(dom, 'desktop', () => {});
    dom.input.value = 'and then a second, longer one.';
    const b = submitSentence(dom, 'desktop', () => {});
    await Promise.all([b, a]);
    expect(dom.plate.textContent).toBe(plateFor('and then a second, longer one.'));
    expect(dom.plate.textContent).not.toBe(plateFor('the first one.'));
  });
});

describe('clearSentence', () => {
  it('Escape and the clear control: empty input, echo and plate, the default subject, and a clear to the scene', () => {
    const { dom } = fakeDom('a thing that runs.');
    dom.echo.textContent = 'a thing that runs.';
    dom.plate.textContent = 'fig. 5 — yours. 4 words, 1 sentence. 9 parts.';
    dom.mailto.href = mailtoHref('a thing that runs.');
    clearSentence(dom);
    expect(dom.input.value).toBe('');
    expect(dom.echo.textContent).toBe('');
    expect(dom.plate.textContent).toBe(copy.yours.plateEmpty);
    expect(dom.mailto.href).toBe(mailtoHref(''));
    expect(events).toEqual([{ type: 'dbso:visitor:clear', detail: null }]);
  });
});
