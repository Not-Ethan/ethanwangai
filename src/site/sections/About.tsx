import { copy } from '../copy';
import { Built } from '../Built';

export function About() {
  const a = copy.about;
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
              <li>{a.logEmpty}</li>
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
