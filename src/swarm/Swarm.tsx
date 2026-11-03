'use client';
import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { mulberry32 } from './prng';
import { AGENT_COLOURS, IDLE_INSET, agentCount, agentName, idlePose, initialPosition, respawnPoint } from './agents';
import { Scheduler, BAR_HEIGHT, FAST_SCROLL_SPEED, isOffscreen, makeAgent, scrolledPast, type AgentState, type Job } from './scheduler';
import { clipFor, sampleJob, type JobSample, type JobTimeline, type Point, type Rect } from './timeline';
import { createSwarmStore, type LogLine, type SwarmStore } from './swarmStore';

export interface SwarmRuntime {
  /** Registers an element the agents will build. Works at any time, before or after Swarm's own effect. */
  register(el: HTMLElement, name: string): () => void;
  store: SwarmStore;
  rebuild(): void;
}

export const SwarmContext = createContext<SwarmRuntime | null>(null);

interface Entry { id: number; name: string; el: HTMLElement; built: boolean; queued: boolean }
interface Runtime extends SwarmRuntime {
  registry: Map<HTMLElement, Entry>;
  byId: Map<number, Entry>;
  observer: IntersectionObserver | null;
  mounted: boolean;
  rebuildImpl: (() => void) | null;
}

const LOG_KEEP = 9;
const LABEL_BELOW = 92;
// a cursor tag sits 16 px under the tip: a tip higher than this (viewport px) would put the tag over the bar, so the cursor is hidden there
const TIP_MIN_Y = BAR_HEIGHT - 16;
const CURSOR_SVG = '<svg viewBox="0 0 18 18" width="18" height="18"><path d="M2 1.5 L2 14.5 L5.6 11.2 L8 16.5 L10.6 15.4 L8.2 10.2 L13 10.2 Z" fill="var(--agent)" style="stroke:var(--surface)" stroke-width="1.5" stroke-linejoin="round"/></svg>';

/** No DOM access here: this runs during render (server and client). */
function createRuntime(): Runtime {
  const store = createSwarmStore();
  const registry = new Map<HTMLElement, Entry>();
  const byId = new Map<number, Entry>();
  let nextId = 1;
  const rt: Runtime = {
    store, registry, byId, observer: null, mounted: false, rebuildImpl: null,
    register(el, name) {
      const entry: Entry = { id: nextId++, name, el, built: false, queued: false };
      registry.set(el, entry);
      byId.set(entry.id, entry);
      rt.observer?.observe(el);
      if (rt.mounted) store.set({ total: registry.size });
      return () => {
        rt.observer?.unobserve(el);
        if (registry.get(el) === entry) registry.delete(el);
        byId.delete(entry.id);
      };
    },
    rebuild() { rt.rebuildImpl?.(); },
  };
  return rt;
}

interface PoolBox { el: HTMLDivElement; until: number; tl: JobTimeline | null; startAt: number; /** label mode: 0 above the box, 1 below it, 2 hidden */ label: 0 | 1 | 2 }
interface Active { entry: Entry | undefined; built: boolean }

const promptOf = (e: Entry | undefined): string | undefined => e?.el.dataset.prompt;

function makeCursor(i: number): HTMLDivElement {
  const c = document.createElement('div');
  c.className = 'cursor';
  c.style.setProperty('--agent', AGENT_COLOURS[i % AGENT_COLOURS.length]);
  c.innerHTML = CURSOR_SVG;
  const tag = document.createElement('span');
  tag.className = 'cursor__tag mono';
  tag.textContent = agentName(i);
  c.appendChild(tag);
  c.style.opacity = '1';
  return c;
}

function makeBox(): PoolBox {
  const el = document.createElement('div');
  el.className = 'selbox';
  for (let k = 0; k < 4; k++) { const h = document.createElement('span'); h.className = 'selbox__h'; el.appendChild(h); }
  const label = document.createElement('span');
  label.className = 'selbox__label mono';
  el.appendChild(label);
  return { el, until: 0, tl: null, startAt: 0, label: 0 };
}

export function Swarm({ children }: { children: ReactNode }) {
  const [runtime] = useState(createRuntime);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.swarmReady = '1';
    const on = root.dataset.swarm === 'on';
    const rt = runtime;
    const store = rt.store;
    const overlay = overlayRef.current;
    const n = agentCount(window.innerWidth);
    rt.mounted = true;
    if (!on || !overlay) {
      store.set({ on: false, agents: n, total: rt.registry.size, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
      return () => { rt.mounted = false; };
    }

    const rand = mulberry32(2026);
    const vp = (): Rect => ({ x: window.scrollX, y: window.scrollY, w: window.innerWidth, h: window.innerHeight });
    const agents: AgentState[] = [];
    for (let i = 0; i < n; i++) agents.push(makeAgent(i, initialPosition(i, vp(), rand), rand() * Math.PI * 2));
    const scheduler = new Scheduler(agents, rand);

    const cursors = agents.map((a, i) => {
      const c = makeCursor(i);
      c.style.transform = `translate3d(${a.x}px, ${a.y}px, 0)`;
      overlay.appendChild(c);
      return c;
    });
    const pool: PoolBox[] = [];
    for (let i = 0; i < 2 * n; i++) { const b = makeBox(); overlay.appendChild(b.el); pool.push(b); }
    const active: (Active | null)[] = agents.map(() => null);
    const idleSince: number[] = agents.map(() => -Infinity);
    const hidden: boolean[] = agents.map(() => false);
    const faded: boolean[] = agents.map(() => false);
    const IDLE_HOLD = 800;
    // per cursor: 0 when it was freed on top of other built content (it fades at once), else IDLE_HOLD
    const holdMs: number[] = agents.map(() => IDLE_HOLD);
    // freed on top of other built content (the tag would sit over it): fade at once. One layout read per call.
    const holdFor = (i: number, entry: Entry | undefined, px: number, py: number, view: Rect): void => {
      holdMs[i] = IDLE_HOLD;
      const tx = px + 14 - view.x, ty = py + 16 - view.y;
      if (tx >= 0 && ty >= 0 && tx <= view.w && ty <= view.h) {
        for (const el of document.elementsFromPoint(tx, ty)) {
          if (el !== entry?.el && (el as HTMLElement).dataset?.built) { holdMs[i] = 0; break; }
        }
      }
    };
    // will-change only while a box is drawn
    const clearBox = (b: PoolBox): void => { b.el.style.opacity = '0'; b.until = 0; b.tl = null; b.el.classList.remove('is-working'); };
    const working: boolean[] = agents.map(() => false);
    const setWorking = (i: number, w: boolean): void => {
      if (working[i] === w) return;
      working[i] = w;
      cursors[i].classList.toggle('is-working', w);
    };
    // an idle cursor fades out 0.8 s after it was freed; it comes back at once (no transition) when it gets a job
    const setFaded = (i: number, f: boolean): void => {
      if (faded[i] === f) return;
      faded[i] = f;
      const st = cursors[i].style;
      st.transition = f ? 'opacity 300ms linear' : 'none';
      st.opacity = f ? '0' : '1';
    };
    // cursor tags flip to the left of the tip when they would cross the right edge; widths measured once, and on resize
    let tagW: number[] = [];
    const measureTags = (): void => { tagW = cursors.map((c) => (c.lastElementChild as HTMLElement).offsetWidth); };
    measureTags();
    window.addEventListener('resize', measureTags);
    const flipped: boolean[] = agents.map(() => false);
    const lastPos: Point[] = agents.map((a) => ({ x: a.x, y: a.y }));
    const tagShift: number[] = agents.map(() => 0);
    const tagUp: boolean[] = agents.map(() => false);
    const place = (i: number, x: number, y: number, extra: string, view: Rect, inset = false): void => {
      // the logical point stays where it is; release and linger poses draw at least IDLE_INSET px inside the viewport (when the point is inside it at all)
      lastPos[i].x = x; lastPos[i].y = y;
      if (inset && x >= view.x && x <= view.x + view.w && y >= view.y && y <= view.y + view.h) {
        x = Math.min(Math.max(x, view.x + IDLE_INSET), view.x + view.w - IDLE_INSET);
        y = Math.min(Math.max(y, view.y + IDLE_INSET), view.y + view.h - IDLE_INSET);
      }
      const f = x + 14 + tagW[i] + 8 > view.x + view.w;
      if (f !== flipped[i]) { flipped[i] = f; cursors[i].classList.toggle('cursor--flip', f); }
      // a flipped tag ends 10 px right of the tip: slide it left so it never crosses 4 px inside the right edge
      const shift = f ? Math.max(0, Math.round(x + 10 - (view.x + view.w - 4))) : 0;
      if (shift !== tagShift[i]) { tagShift[i] = shift; cursors[i].style.setProperty('--tag-shift', String(shift)); }
      // near the bottom edge the tag sits above the tip
      const up = y + 32 > view.y + view.h;
      if (up !== tagUp[i]) { tagUp[i] = up; cursors[i].classList.toggle('cursor--up', up); }
      cursors[i].style.transform = `translate3d(${x}px, ${y}px, 0)${extra}`;
      // a tip outside the viewport hides the whole cursor (no tag slivers), in any phase
      setHidden(i, x < view.x || x > view.x + view.w || y < view.y + TIP_MIN_Y || y > view.y + view.h);
    };
    const setHidden = (i: number, h: boolean): void => {
      if (hidden[i] === h) return;
      hidden[i] = h;
      cursors[i].style.visibility = h ? 'hidden' : 'visible';
    };

    let built = 0;
    let logId = 0;
    let log: LogLine[] = [];
    let dirty = false;
    let lastBusy = false;
    let started = false;
    let raf = 0;
    let lastSweep = 0;
    let lastWake = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let alive = true;

    const markBuilt = (e: Entry): void => {
      e.queued = false;
      if (e.built) return;
      e.built = true;
      e.el.dataset.built = '1';
      e.el.style.clipPath = '';
      e.el.style.opacity = '';
      built++;
      dirty = true;
    };

    // the loop idles when nothing is moving; anything that can create work restarts it (see wake)
    let frame: () => void = () => {};
    const wake = (): void => {
      lastWake = performance.now();
      if (alive && !raf) raf = requestAnimationFrame(frame);
    };
    const onIntersect = (items: IntersectionObserverEntry[]): void => {
      const hits = items.filter((it) => it.isIntersecting);
      hits.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      if (hits.length > 0) wake();
      for (const it of hits) {
        const e = rt.registry.get(it.target as HTMLElement);
        rt.observer?.unobserve(it.target);
        if (e && !e.built && !e.queued) { e.queued = true; scheduler.enqueue({ id: e.id, name: e.name }); }
      }
    };
    const observer = new IntersectionObserver(onIntersect, { threshold: 0.1, rootMargin: '0px 0px 80px 0px' });
    rt.observer = observer;
    for (const e of rt.registry.values()) { if (!e.built) observer.observe(e.el); }

    store.set({ on: true, agents: n, total: rt.registry.size, built: 0, log: [], busy: false });

    // start when the fonts are ready or after 600 ms, whichever is first, then wait 150 ms
    let startArmed = false;
    const armStart = (): void => {
      if (startArmed || !alive) return;
      startArmed = true;
      timers.push(setTimeout(() => { started = true; wake(); }, 150));
    };
    document.fonts.ready.then(armStart);
    timers.push(setTimeout(armStart, 600));

    // keyboard focus on or inside an unbuilt element builds it instantly, so nothing focused is ever invisible
    const onFocusIn = (ev: FocusEvent): void => {
      const target = ev.target as Element | null;
      const host = target && typeof target.closest === 'function' ? target.closest('[data-build]') : null;
      const e = host ? rt.registry.get(host as HTMLElement) : undefined;
      if (!e || e.built) return;
      wake();
      const i = agents.findIndex((a, k) => a.busy && active[k]?.entry === e);
      if (i >= 0) {
        // mid-job: finish it where the cursor is
        const a = agents[i];
        for (const b of pool) { if (b.tl === a.timeline) { clearBox(b); } }
        markBuilt(e);
        scheduler.abandon(a, { x: lastPos[i].x, y: lastPos[i].y });
        holdFor(i, active[i]?.entry, a.x, a.y, vp());
        active[i] = null;
        idleSince[i] = performance.now();
        setFaded(i, false);
        return;
      }
      // still waiting in the queue: take it out so no agent draws a box over a built element
      const qi = scheduler.queue.findIndex((j) => j.id === e.id);
      if (qi >= 0) scheduler.queue.splice(qi, 1);
      markBuilt(e);
      observer.unobserve(e.el);
    };
    document.addEventListener('focusin', onFocusIn);

    const measure = (job: Job): Rect | null => {
      const e = rt.byId.get(job.id);
      if (!e || !e.el.isConnected) return null;
      const r = e.el.getBoundingClientRect();
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
    };

    // scroll speed in px/s over the last ~120 ms of scroll events; 0 once the page has been still that long
    const scrollLog: { t: number; y: number }[] = [];
    const onScrollSample = (): void => {
      const t = performance.now();
      scrollLog.push({ t, y: window.scrollY });
      while (scrollLog.length > 1 && t - scrollLog[0].t > 120) scrollLog.shift();
    };
    const scrollSpeed = (now: number): number => {
      while (scrollLog.length > 0 && now - scrollLog[0].t > 120) scrollLog.shift();
      if (scrollLog.length < 2) return 0;
      const a = scrollLog[0], b = scrollLog[scrollLog.length - 1];
      return (Math.abs(b.y - a.y) / Math.max(b.t - a.t, 16)) * 1000;
    };
    window.addEventListener('scroll', onScrollSample, { passive: true });

    const sample: JobSample = { phase: 'travel', cx: 0, cy: 0, f: 0, scale: 1, boxAlpha: 0, fillAlpha: 0 };
    const boxSample: JobSample = { phase: 'travel', cx: 0, cy: 0, f: 0, scale: 1, boxAlpha: 0, fillAlpha: 0 };
    const pt: Point = { x: 0, y: 0 };

    frame = (): void => {
      raf = 0;
      const now = performance.now();
      const view = vp();

      if (started && scheduler.queue.length > 0) {
        const d = scheduler.dispatch(now, view, measure, {
          skipCovered: true,
          fast: scrollSpeed(now) > FAST_SCROLL_SPEED,
          // a faded or off-screen cursor reappears just outside the nearest edge, not wherever it last rested
          prepare: (agent, rect) => {
            if (faded[agent.id] || hidden[agent.id]) {
              const p = respawnPoint({ x: rect.x, y: rect.y }, view, rand);
              agent.x = p.x; agent.y = p.y;
            }
          },
        });
        for (const j of [...d.instant, ...d.dropped]) { const e = rt.byId.get(j.id); if (e) markBuilt(e); }
        for (const s of d.started) {
          let box = pool.find((b) => b.until <= now);
          if (!box) box = pool.reduce((a, b) => (b.until < a.until ? b : a));
          box.until = s.agent.startAt + s.timeline.tEnd;
          box.tl = s.timeline;
          box.el.classList.add('is-working');
          box.startAt = s.agent.startAt;
          box.el.style.setProperty('--agent', AGENT_COLOURS[s.agent.id % AGENT_COLOURS.length]);
          box.el.style.opacity = '0';
          (box.el.lastElementChild as HTMLElement).textContent = promptOf(rt.byId.get(s.job.id)) ?? s.job.name;
          active[s.agent.id] = { entry: rt.byId.get(s.job.id), built: false };
        }
      }

      // sweep: anything scrolled past without ever intersecting (scrollbar drag, jump) is built instantly
      if (started && now - lastSweep >= 250) {
        lastSweep = now;
        // all reads first, then all writes, so the sweep never interleaves layout reads with style writes
        const take: Entry[] = [];
        for (const e of rt.registry.values()) {
          if (e.built || e.queued || !e.el.isConnected) continue;
          // display:none elements (e.g. the phone nav) never intersect and have no box: build them instantly too
          if (e.el.getClientRects().length === 0) { take.push(e); continue; }
          const r = e.el.getBoundingClientRect();
          if (scrolledPast(r.bottom + view.y, view.y)) take.push(e);
        }
        // in-flight jobs whose element is now far off-screen: build instantly, hide the box, free the agent where its cursor is
        const leave: number[] = [];
        for (let i = 0; i < agents.length; i++) {
          const a = agents[i];
          if (a.busy && active[i] && a.timeline && now - a.startAt >= 0 && isOffscreen(a.timeline.rect, view)) leave.push(i);
        }
        for (const e of take) { observer.unobserve(e.el); markBuilt(e); }
        for (const i of leave) {
          const a = agents[i];
          const act = active[i]!;
          if (act.entry) markBuilt(act.entry);
          for (const b of pool) { if (b.tl === a.timeline) { clearBox(b); } }
          scheduler.abandon(a, { x: lastPos[i].x, y: lastPos[i].y });
          holdFor(i, act.entry, a.x, a.y, view);
          active[i] = null;
          idleSince[i] = now;
          setFaded(i, false);
        }
      }

      // boxes: active and lingering ones sample their own stored timeline
      for (const b of pool) {
        if (!b.tl) continue;
        const t = now - b.startAt;
        if (now >= b.until) { clearBox(b); continue; }
        if (t < 0) continue;
        const r = b.tl.rect;
        // the label never sits above y = 68 (under the bar): a box whose top is within 92 px of the viewport top gets it below; re-decided every frame since the page scrolls
        // (and when even the below position would sit under the bar, because the box scrolled up behind it, the label is hidden)
        const mode: 0 | 1 | 2 = r.y - view.y >= LABEL_BELOW ? 0 : r.y + r.h + 6 < view.y + BAR_HEIGHT ? 2 : 1;
        if (mode !== b.label) {
          b.label = mode;
          const ls = (b.el.lastElementChild as HTMLElement).style;
          ls.top = mode === 1 ? 'calc(100% + 6px)' : '';
          ls.visibility = mode === 2 ? 'hidden' : '';
        }
        sampleJob(b.tl, t, boxSample);
        const st = b.el.style;
        st.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
        st.width = `${boxSample.f * r.w}px`;
        st.height = `${boxSample.f * r.h}px`;
        st.opacity = String(boxSample.boxAlpha);
        st.setProperty('--fill', String(boxSample.fillAlpha));
      }

      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        const act = active[i];
        setWorking(i, a.busy && !!act && !!a.timeline);
        if (a.busy && act && a.timeline) {
          const tl = a.timeline;
          const t = now - a.startAt;
          setFaded(i, false);
          holdMs[i] = IDLE_HOLD;
          if (t < 0) {
            place(i, a.x, a.y, '', view);
            continue;
          }
          sampleJob(tl, t, sample);
          place(i, sample.cx, sample.cy, ` scale(${sample.scale})`, view, sample.phase === 'release' || sample.phase === 'linger' || sample.phase === 'done');
          if (!act.built) {
            if (t >= tl.tDrag) {
              act.built = true;
              if (act.entry) {
                markBuilt(act.entry);
                log = [...log, { id: ++logId, agent: a.id, name: act.entry.name, prompt: promptOf(act.entry) ?? act.entry.name, seconds: (tl.travel + tl.drag) / 1000 }].slice(-LOG_KEEP);
                dirty = true;
              }
            } else if (act.entry && sample.phase !== 'travel') {
              // revealed only inside the box: opacity comes on with the clip (the hidden state is opacity 0, see globals.css)
              act.entry.el.style.opacity = '1';
              act.entry.el.style.clipPath = clipFor(sample.f);
            }
          }
          if (t >= tl.tRelease) { if (act.entry) act.entry.queued = false;
            scheduler.free(a); active[i] = null; idleSince[i] = now;
            holdFor(i, act.entry, a.x, a.y, view);
          }
        } else if (idlePose(a, view, now / 1000, pt)) {
          // ease the drift in over 400 ms after release so the cursor does not jump
          const k = Math.min(1, (now - idleSince[i]) / 400);
          const x = a.x + (pt.x - a.x) * k;
          const y = a.y + (pt.y - a.y) * k;
          setFaded(i, now - idleSince[i] >= holdMs[i]);
          place(i, x, y, '', view);
        } else {
          setHidden(i, true);
        }
      }

      const busy = scheduler.queue.length > 0 || agents.some((a) => a.busy);
      if (dirty || busy !== lastBusy) {
        dirty = false;
        lastBusy = busy;
        store.set({ built, log, busy });
      }

      // keep going while anything is moving: a busy agent or queued job, a lingering box, an idle cursor still drifting
      // (visible and not yet faded), or within 300 ms of a wake so the sweep runs once after the last scroll
      let more = busy || now - lastWake < 300 || !started;
      if (!more) more = pool.some((b) => b.tl !== null);
      if (!more) more = agents.some((a, i) => !a.busy && !hidden[i] && !faded[i]);
      if (more && alive) raf = requestAnimationFrame(frame);
    };
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    wake();

    rt.rebuildImpl = () => {
      // nothing above the reader, so the sweep has nothing to take
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      // keyboard focus moves to the h1 (already built, so the focusin handler leaves it alone) instead of falling to the body
      document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
      for (const e of rt.registry.values()) {
        delete e.el.dataset.built;
        e.el.style.clipPath = '';
        e.el.style.opacity = '';
        e.built = false;
        e.queued = false;
        observer.unobserve(e.el);
        observer.observe(e.el);
      }
      scheduler.reset();
      active.fill(null);
      for (const b of pool) { clearBox(b); }
      const t0 = performance.now();
      for (let i = 0; i < agents.length; i++) { idleSince[i] = t0; holdMs[i] = IDLE_HOLD; }
      built = 0; log = []; dirty = false; lastBusy = false;
      store.set({ built: 0, log: [], busy: false });
      wake();
    };

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measureTags);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('scroll', onScrollSample);
      window.removeEventListener('resize', wake);
      document.removeEventListener('focusin', onFocusIn);
      timers.forEach(clearTimeout);
      observer.disconnect();
      rt.observer = null;
      rt.rebuildImpl = null;
      rt.mounted = false;
      overlay.replaceChildren();
    };
  }, [runtime]);

  return (
    <SwarmContext.Provider value={runtime}>
      <div className="swarm" ref={overlayRef} aria-hidden="true" />
      {children}
    </SwarmContext.Provider>
  );
}
