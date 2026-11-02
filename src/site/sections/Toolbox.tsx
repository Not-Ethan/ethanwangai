import { copy } from '../copy';
import { Built } from '../Built';

export function Toolbox() {
  const t = copy.toolbox;
  return (
    <section id="toolbox" className="sec sec-toolbox band-2">
      <div className="wrap">
        <Built name="h2 toolbox" className="section__head" prompt={copy.prompts['h2 toolbox']}>
          <h2 className="h2">{t.h2}</h2>
        </Built>
        <div className="rows">
          {t.rows.map((row) => (
            <Built key={row.label} name={`row ${row.label}`} className="row" prompt={copy.prompts[`row ${row.label}`]}>
              <h3 className="row__label">{row.label}</h3>
              <div className="chips">
                {row.chips.map((c) => <span key={c} className="chip">{c}</span>)}
              </div>
            </Built>
          ))}
        </div>
      </div>
    </section>
  );
}
