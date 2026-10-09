// String surgery on three's built-in shaders for onBeforeCompile patches.

/** Replaces the first `anchor` in `source`, or throws naming it, so a renamed chunk fails loudly instead of silently. */
export function inject(source: string, anchor: string, replacement: string): string {
  if (!source.includes(anchor)) throw new Error(`shader anchor not found: ${anchor}`);
  return source.replace(anchor, () => replacement);
}
