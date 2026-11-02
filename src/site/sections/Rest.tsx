import { copy } from '../copy';
import { Built } from '../Built';

export function Rest() {
  const r = copy.rest;
  return (
    <section id="rest" className="sec sec-rest">
      <div className="wrap">
        <Built name="h2 rest" className="section__head" prompt={copy.prompts['h2 rest']}>
          <h2 className="h2">{r.h2}</h2>
        </Built>
        <div className="creds">
          {r.cards.map((c) => (
            <Built key={c.title} name={`card ${c.title}`} className="card cred" prompt={copy.prompts[`card ${c.title}`]}>
              <h3 className="eyebrow-sm">{c.title}</h3>
              <ul>
                {c.entries.map((en) => (
                  <li key={en.name}>
                    <b>{en.name}</b>
                    <span className="muted">{en.line}</span>
                  </li>
                ))}
              </ul>
            </Built>
          ))}
        </div>
      </div>
    </section>
  );
}
