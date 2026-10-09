// FNV-1a, 32-bit, unsigned. Spec §5.4: the house seed is hashString(sentence.trim().toLowerCase()).
// Hashes UTF-16 code units (charCodeAt), which equals the byte-wise FNV-1a for ASCII input.
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function hashString(s: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}
