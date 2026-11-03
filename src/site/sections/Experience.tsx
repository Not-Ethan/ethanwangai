import { copy } from '../copy';
import { Built } from '../Built';
import { IndexHighlight } from './IndexHighlight';

export function Experience() {
  const e = copy.experience;
  return (
    <section id="experience" className="sec sec-experience">
      <div className="wrap xp">
        <aside className="xp__index">
          <Built name="h2 experience" className="section__head" prompt={copy.prompts['h2 experience']}>
            <h2 className="h2">{e.h2}</h2>
          </Built>
          <Built name="index" as="ol" className="xp__list" prompt={copy.prompts.index}>
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
            <Built key={j.id} name={`card ${j.id}`} as="article" className="card job" id={`job-${j.id}`} prompt={copy.prompts[`card ${j.id}`]}>
              <h3 className="job__title">{j.name} · {j.role}</h3>
              <p className="job__when"><b>{j.when}</b> · <span className="subtle">{j.place}</span></p>
              <p className="job__lede">{j.lede}</p>
              <p className="job__body">{j.body}</p>
            </Built>
          ))}
        </div>
      </div>
      <IndexHighlight />
    </section>
  );
}
