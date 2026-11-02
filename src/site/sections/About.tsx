'use client';
import type { CSSProperties } from 'react';
import { copy } from '../copy';
import { AGENT_COLOURS, agentName } from '@/swarm/agents';
import { useSwarmStats } from '@/swarm/useSwarmStats';
import { Built } from '../Built';

export function About() {
  const a = copy.about;
  const s = useSwarmStats();
  return (
    <section id="about" className="sec sec-about">
      <div className="wrap">
        <Built name="h2 about" className="section__head">
          <p className="eyebrow">{a.eyebrow}</p>
          <h2 className="h2">{a.h2}</h2>
        </Built>
        <div className="about__grid">
          <Built name="log" className="card log">
            <p className="eyebrow">{a.logTitle}</p>
            <ol className="log__lines mono" data-log>
              {s.log.length === 0 ? <li>{s.reduced ? a.logReduced : a.logEmpty}</li> : s.log.map((l) => {
                const who = agentName(l.agent);
                return (
                  <li key={l.id}>
                    <span className="log__agent" style={{ '--agent': AGENT_COLOURS[l.agent % AGENT_COLOURS.length] } as CSSProperties}>{who}</span>
                    {a.logLine(who, l.name, l.seconds).slice(who.length)}
                  </li>
                );
              })}
            </ol>
          </Built>
          <div className="about__right">
            <Built name="lede" as="p" className="lede">{a.lede}</Built>
            <Built name="notes" className="notes">
              {a.notes.map((n) => <p key={n} className="muted">{n}</p>)}
            </Built>
          </div>
        </div>
      </div>
    </section>
  );
}
