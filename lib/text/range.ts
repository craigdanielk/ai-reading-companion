const WORD = /[\p{L}\p{N}\p{M}]/u;

function isWord(ch: string | undefined): boolean {
  return !!ch && WORD.test(ch);
}

/**
 * A selection that cuts a word in half hands the model a non-word. Left alone it
 * will confidently explain the fragment as some other language entirely, so every
 * range is walked out to the surrounding word edges and then trimmed of space.
 */
export function snapRange(
  text: string,
  start: number,
  end: number
): { start: number; end: number } {
  let s = Math.max(0, Math.min(Math.round(start), text.length));
  let e = Math.max(s, Math.min(Math.round(end), text.length));

  while (s > 0 && isWord(text[s - 1]) && isWord(text[s])) s--;
  while (e < text.length && isWord(text[e]) && isWord(text[e - 1])) e++;

  while (s < e && /\s/.test(text[s])) s++;
  while (e > s && /\s/.test(text[e - 1])) e--;

  return { start: s, end: e };
}
