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
        <Built name="h2 about" className="section__head" prompt={copy.prompts['h2 about']}>
          <h2 className="h2">{a.h2}</h2>
        </Built>
        <div className="about__grid">
          <Built name="log" className="card log" prompt={copy.prompts.log}>
            <p className="eyebrow-sm">{a.logTitle}</p>
            <ol className="log__lines mono when-on" data-log>
              {s.log.map((l) => {
                const who = agentName(l.agent);
                return (
                  <li key={l.id}>
                    <span className="log__swatch" aria-hidden="true" style={{ '--agent': AGENT_COLOURS[l.agent % AGENT_COLOURS.length] } as CSSProperties} />
                    <span className="log__agent">{who}</span>
                    <span className="log__prompt">{l.prompt || l.name}</span>
                    <span className="log__time">{`${l.seconds.toFixed(2)}s`}</span>
                  </li>
                );
              })}
              <li className="log__caret" aria-hidden="true">▌</li>
            </ol>
          </Built>
          <div className="about__right">
            <Built name="lede" as="p" className="lede" prompt={copy.prompts.lede}><mark className="hi">{a.ledeMark}</mark> {a.lede}</Built>
            <Built name="notes" className="notes" prompt={copy.prompts.notes}>
              {a.notes.map((n) => <p key={n} className="muted">{n}</p>)}
            </Built>
          </div>
        </div>
      </div>
    </section>
  );
}
