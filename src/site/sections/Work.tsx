import { copy } from '../copy';
import { Built } from '../Built';
import { Shot } from '../Shots';

export function Work() {
  const w = copy.work;
  return (
    <section id="work" className="sec sec-work band-3">
      <div className="wrap">
        <Built name="h2 work" className="section__head" prompt={copy.prompts['h2 work']}>
          <h2 className="h2">{w.h2}</h2>
          <p className="muted section__intro">{w.intro}</p>
        </Built>
        <div className="cases">
          {w.cases.map((c, i) => (
            <article key={c.id} className="case" data-flip={i % 2 === 1}>
              <Built name={`shot ${c.id}`} className="card card-6 case__shot" prompt={copy.prompts[`shot ${c.id}`]}>
                <Shot kind={c.shot} />
              </Built>
              <Built name={`body ${c.id}`} className="case__body" prompt={copy.prompts[`body ${c.id}`]}>
                <p className="mono case__no">{c.year} · {c.kind}</p>
                <h3>{c.title}</h3>
                <p className="case__tag muted">{c.tag}</p>
                <p className="case__lede">{c.lede}</p>
                <div className="chips">
                  {c.chips.map((x) => <span key={x} className="chip">{x}</span>)}
                </div>
              </Built>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
