/** Splits a figure into space-separated tokens; a token containing a hyphen is marked nowrap so a line never
 *  breaks inside it (spec §9 figures are read as units: `all-time`, not `all-` / `time`). Pure, no DOM. */
export function figureTokens(text: string): { text: string; nowrap: boolean }[] {
  return text.split(' ').filter((t) => t.length > 0).map((t) => ({ text: t, nowrap: t.includes('-') }));
}
