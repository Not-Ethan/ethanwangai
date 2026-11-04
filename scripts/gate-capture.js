async (page) => {
  // Visual-gate capture for the agents-build-the-site redesign (plan Task 5 Step 1).
  // Serve the export first: `npx serve out -l 3011`, then call it through the Playwright MCP tool browser_run_code_unsafe with filename "scripts/gate-capture.js". Stills land in .playwright-mcp/gate/ (gitignored).
  const BASE = 'http://localhost:3011/';
  const DIR = '.playwright-mcp/gate/';
  // No `require` in the MCP sandbox: page.screenshot creates the directory; the report is returned, not written.
  const shot = (name) => page.screenshot({ path: `${DIR}${name}.jpeg`, type: 'jpeg', quality: 82 });
  const full = (name) => page.screenshot({ path: `${DIR}${name}.jpeg`, type: 'jpeg', quality: 70, fullPage: true });
  const state = () => page.evaluate(() => {
    const all = [...document.querySelectorAll('[data-build]')];
    const unbuilt = all.filter((el) => !el.hasAttribute('data-built')).map((el) => el.getAttribute('data-build'));
    const boxes = [...document.querySelectorAll('.selbox')].map((b) => Number(getComputedStyle(b).opacity)).filter((o) => o > 0.05).length;
    return {
      swarm: document.documentElement.dataset.swarm ?? null,
      ready: document.documentElement.dataset.swarmReady ?? null,
      total: all.length, built: all.length - unbuilt.length, unbuilt,
      cursors: document.querySelectorAll('.cursor').length, visibleBoxes: boxes,
      status: document.querySelector('[data-status]')?.textContent ?? null,
      log: [...document.querySelectorAll('[data-log] li')].map((li) => li.textContent),
      errors: window.__gateErrors ?? [],
    };
  });
  // Scroll like a person: 600 px steps every 120 ms (an instant jump never intersects the elements it passes).
  const scrollTo = async (y) => {
    await page.evaluate(async (y) => {
      document.documentElement.style.scrollBehavior = 'auto';
      const step = 600; let cur = window.scrollY;
      const dir = y > cur ? 1 : -1;
      while ((dir > 0 && cur < y) || (dir < 0 && cur > y)) {
        cur = dir > 0 ? Math.min(cur + step, y) : Math.max(cur - step, y);
        window.scrollTo(0, cur);
        await new Promise((r) => setTimeout(r, 120));
      }
    }, y);
  };
  const scrollToId = async (id) => scrollTo(await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + window.scrollY - 64, id));
  const report = {};
  page.on('pageerror', (e) => { report.pageErrors = (report.pageErrors || []).concat(String(e)); });

  // Desktop, motion allowed.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: 'load' });
  const t0 = Date.now();
  for (const ms of [400, 1000, 2000, 4000]) {
    const wait = t0 + ms - Date.now(); if (wait > 0) await page.waitForTimeout(wait);
    await shot(`d-load-${ms}`);
    report[`d-load-${ms}`] = await state();
  }
  for (const id of ['about', 'toolbox', 'experience', 'work', 'rest', 'contact']) {
    await scrollToId(id);
    await page.waitForTimeout(500); await shot(`d-${id}-0.5`);
    await page.waitForTimeout(2000); await shot(`d-${id}-2.5`);
    report[`d-${id}`] = await state();
  }
  await scrollTo(await page.evaluate(() => document.body.scrollHeight));
  await page.waitForTimeout(3000);
  await scrollTo(0);
  await page.waitForTimeout(1500);
  await full('d-full');
  report['d-final'] = await state();

  // Opening (spec 14.3): stills at 0.3, 0.7, 1.1 and 1.5 s after load, while an in-page sampler (every 50 ms) counts the visible cursors and notes the first visible selbox.
  // Expect an empty canvas with cursors spawning and milling, all agents visible by 0.9 s, and no box before about 1.3 s.
  await page.goto(BASE, { waitUntil: 'load' });
  const o0 = Date.now();
  const sampler = page.evaluate(() => new Promise((resolve) => {
    const start = performance.now();
    const samples = [];
    let firstBoxAt = null;
    const tick = () => {
      const t = performance.now() - start;
      const cursors = [...document.querySelectorAll('.cursor')].filter((c) => { const cs = getComputedStyle(c); return cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05; }).length;
      samples.push({ t, cursors });
      if (firstBoxAt === null && [...document.querySelectorAll('.selbox')].some((b) => Number(getComputedStyle(b).opacity) > 0.05)) firstBoxAt = Math.round(t);
      if (t > 3000) resolve({ samples, firstBoxAt }); else setTimeout(tick, 50);
    };
    tick();
  }));
  for (const ms of [300, 700, 1100, 1500]) {
    const wait = o0 + ms - Date.now(); if (wait > 0) await page.waitForTimeout(wait);
    await shot(`d-open-${ms / 1000}`);
  }
  const op = await sampler;
  const at = (ms) => { const near = op.samples.reduce((a, b) => (Math.abs(b.t - ms) < Math.abs(a.t - ms) ? b : a)); return near.cursors; };
  report.opening = { cursorsVisibleAt: { 300: at(300), 700: at(700), 1100: at(1100), 1500: at(1500) }, firstBoxAt: op.firstBoxAt };

  // Release burst: in the about section, poll every 20 ms for a box carrying selbox--done, then three stills 60 ms apart.
  await page.evaluate(() => { window.__rel = null; });
  await scrollToId('about');
  const relHandle = await page.waitForFunction(() => {
    const about = document.getElementById('about').getBoundingClientRect();
    for (const b of document.querySelectorAll('.selbox--done')) {
      const r = b.getBoundingClientRect();
      if (r.top + r.height / 2 < about.top || r.top + r.height / 2 > about.bottom) continue;
      window.__rel = { border: getComputedStyle(b).borderTopColor, label: b.lastElementChild.textContent, at: Math.round(performance.now()) };
      return true;
    }
    return false;
  }, null, { polling: 20, timeout: 8000 }).catch(() => null);
  if (relHandle) {
    for (let k = 0; k < 3; k++) { await shot(`d-release-${k}`); await page.waitForTimeout(60); }
    const rel = await page.evaluate(() => window.__rel);
    const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(rel.border);
    const accent = !!m && Number(m[1]) > 230 && Number(m[2]) > 170 && Number(m[3]) < 40;
    report.release = { border: rel.border, borderIsAccentAtFirstStill: accent, label: rel.label, labelStartsWithCheck: rel.label.startsWith('\u2713') };
  } else report.release = { error: 'no selbox--done seen in about' };

  // Continuous scroll (wheel / trackpad) on a fresh load: how many below-the-fold elements were drawn by a selbox while in view. 4 px per frame must reach 100 %, 20 px per frame (about 1200 px/s) at least 80 %.
  const continuousPass = async (px) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  return page.evaluate(async (px) => {
    document.documentElement.style.scrollBehavior = 'auto';
    const vh = window.innerHeight;
    const els = [...document.querySelectorAll('[data-build]')];
    const below = els.filter((el) => el.getBoundingClientRect().top >= vh);
    const drawn = new Set();
    const norm = (t) => (t || '').replace(/^\u2713 /, '').trim().toLowerCase();
    // drawn = a visible selbox carrying the element's prompt overlaps the element's current rect while the element is at least partly in the viewport
    const sample = setInterval(() => {
      const boxes = [...document.querySelectorAll('.selbox')].filter((b) => Number(getComputedStyle(b).opacity) > 0.05).map((b) => ({ label: norm(b.textContent), r: b.getBoundingClientRect() }));
      for (const el of below) {
        const r = el.getBoundingClientRect();
        if (!(r.bottom > 0 && r.top < window.innerHeight)) continue;
        const label = norm(el.getAttribute('data-prompt'));
        if (boxes.some((b) => b.label === label && Math.min(b.r.right, r.right) > Math.max(b.r.left, r.left) && Math.min(b.r.bottom, r.bottom) > Math.max(b.r.top, r.top))) drawn.add(label);
      }
    }, 100);
    await new Promise((resolve) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const tick = () => { window.scrollBy(0, px); if (window.scrollY >= max - 1) resolve(); else requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    await new Promise((r) => setTimeout(r, 150));
    clearInterval(sample);
    const prompts = below.map((el) => el.getAttribute('data-prompt'));
    const undrawn = prompts.filter((p) => !drawn.has(norm(p)));
    const belowFold = prompts.length;
    return { belowFold, drawn: belowFold - undrawn.length, pct: belowFold ? Math.round(((belowFold - undrawn.length) / belowFold) * 100) : 100, undrawn };
  }, px);
  };
  report.continuous = await continuousPass(4);
  report.continuousFast = await continuousPass(20);

  // Sticky passes: the experience column's heading and index stick at top: 96px. From each start offset and speed, scroll through the section; both must get an overlapping box while on screen. All 8 runs must pass.
  const stickyPass = async (start, px) => {
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await page.evaluate((y) => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, y); }, start);
    await page.waitForTimeout(300);
    return page.evaluate(async (px) => {
      const names = ['h2 experience', 'index'];
      const targets = names.map((n) => document.querySelector(`[data-build="${n}"]`));
      const seen = { 'h2 experience': false, index: false };
      const norm = (t) => (t || '').replace(/^\u2713 /, '').trim().toLowerCase();
      const check = () => {
        const boxes = [...document.querySelectorAll('.selbox')].filter((b) => Number(getComputedStyle(b).opacity) > 0.05).map((b) => ({ label: norm(b.textContent), r: b.getBoundingClientRect() }));
        names.forEach((n, i) => {
          const el = targets[i]; if (!el) return;
          const r = el.getBoundingClientRect();
          if (!(r.bottom > 0 && r.top < window.innerHeight)) return;
          const label = norm(el.getAttribute('data-prompt'));
          if (boxes.some((b) => b.label === label && Math.min(b.r.right, r.right) > Math.max(b.r.left, r.left) && Math.min(b.r.bottom, r.bottom) > Math.max(b.r.top, r.top))) seen[n] = true;
        });
      };
      const sample = setInterval(check, 50);
      const section = document.getElementById('experience');
      await new Promise((resolve) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const tick = () => {
          window.scrollBy(0, px);
          const bottom = section.getBoundingClientRect().bottom;
          if (bottom < 0 || window.scrollY >= max - 1) resolve(); else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await new Promise((r) => setTimeout(r, 100));
      clearInterval(sample);
      return seen;
    }, px);
  };
  const stickyFailures = [];
  let stickyRuns = 0, stickyPassed = 0;
  for (const start of [800, 1200, 1600, 1800]) {
    for (const px of [8, 16]) {
      const seen = await stickyPass(start, px);
      stickyRuns++;
      if (seen['h2 experience'] && seen.index) stickyPassed++; else stickyFailures.push({ start, px, seen });
    }
  }
  report.stickyPasses = { runs: stickyRuns, passed: stickyPassed, failures: stickyFailures };

  // Rebuild button.
  await scrollToId('contact');
  await page.waitForTimeout(800);
  const rebuild = await page.$('[data-rebuild]');
  if (rebuild) { await rebuild.click(); await page.waitForTimeout(700); await shot('d-rebuild-0.7'); report['d-rebuild'] = await state(); }

  // Phone.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'load' });
  const p0 = Date.now();
  for (const ms of [1000, 3000]) {
    const wait = p0 + ms - Date.now(); if (wait > 0) await page.waitForTimeout(wait);
    await shot(`p-load-${ms}`);
    report[`p-load-${ms}`] = await state();
  }
  await scrollToId('work');
  await page.waitForTimeout(2500); await shot('p-work-2.5');
  await scrollTo(await page.evaluate(() => document.body.scrollHeight));
  await page.waitForTimeout(3000);
  await scrollTo(0);
  await page.waitForTimeout(1500);
  await full('p-full');
  report['p-final'] = await state();

  // Reduced motion: no swarm, everything visible at once.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await shot('rm-load-0.3');
  report['rm'] = await state();
  report['rm'].hiddenByClip = await page.evaluate(() => [...document.querySelectorAll('[data-build]')].filter((el) => getComputedStyle(el).clipPath !== 'none').length);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // Bundle blocked: the inline script's 6 s fallback must reveal the page.
  await page.route('**/*.js', (r) => r.abort());
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  report['nojs-1s'] = await state();
  await page.waitForTimeout(6500);
  await shot('nojs-7.5');
  report['nojs-7.5'] = await state();
  report['nojs-7.5'].hiddenByClip = await page.evaluate(() => [...document.querySelectorAll('[data-build]')].filter((el) => getComputedStyle(el).clipPath !== 'none').length);
  await page.unroute('**/*.js');

  return report;
}
