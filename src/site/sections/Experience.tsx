import { copy } from '../copy';
import { Built } from '../Built';
import { IndexHighlight } from './IndexHighlight';

export function Experience() {
  const e = copy.experience;
  return (
    <section id="experience" className="sec sec-experience">
      <div className="wrap xp">
        <aside className="xp__index">
          <Built name="h2 experience" className="section__head">
            <p className="eyebrow">{e.eyebrow}</p>
            <h2 className="h2">{e.h2}</h2>
          </Built>
          <Built name="index" as="ol" className="xp__list">
            {e.jobs.map((j) => (
              <li key={j.id} data-xp-item={`job-${j.id}`}>
                <a href={`#job-${j.id}`}>
                  <span className="xp__dot" aria-hidden="true" />
                  <span className="xp__name">{j.name}</span>
                  <span className="xp__sub">{j.sub}</span>
                </a>
              </li>
            ))}
          </Built>
        </aside>
        <div className="xp__detail">
          {e.jobs.map((j) => (
            <Built key={j.id} name={`card ${j.id}`} as="article" className="card job" id={`job-${j.id}`}>
              <h3 className="job__title only-phone">{j.name} · {j.role}</h3>
              <p className="job__when"><b>{j.when}</b> · <span className="subtle">{j.place}</span></p>
              <p className="job__lede">{j.lede}</p>
              <ul className="job__points">
                {j.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
              <div className="chips">
                {j.chips.map((c) => <span key={c} className="chip">{c}</span>)}
              </div>
            </Built>
          ))}
        </div>
      </div>
      <IndexHighlight />
    </section>
  );
}
