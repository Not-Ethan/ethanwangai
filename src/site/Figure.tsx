/** An oversized mono evidence figure (spec §9: 48–72 px, tabular numerals). No count-up: it is printed as is. */
export function Figure({ children }: { children: string }) {
  return <p className="mono-figure" data-reveal>{children}</p>;
}
