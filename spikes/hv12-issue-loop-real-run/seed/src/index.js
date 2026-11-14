// durations: parse and format time spans such as "1h30m", "90s" or "250ms".

/** Milliseconds in one of each unit. */
const UNITS = { h: 3_600_000, m: 60_000, s: 1_000, ms: 1 };

/** Milliseconds in a span such as "1h30m", "90s" or "250ms". */
export function parse(text) {
  const names = Object.keys(UNITS).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`^(\\d+)(${names.join('|')})`);
  let rest = text;
  let total = 0;
  while (rest.length > 0) {
    const match = pattern.exec(rest);
    total += Number(match[1]) * UNITS[match[2]];
    rest = rest.slice(match[0].length);
  }
  return total;
}

/** A span in whole units, largest first: 5_400_000 gives "1h 30m". */
export function format(ms) {
  if (!Number.isFinite(ms) || ms < 0) throw new RangeError(`not a duration: ${ms}`);
  let rest = Math.floor(ms / 1000);
  const parts = [];
  for (const [unit, size] of [
    ['h', 3600],
    ['m', 60],
    ['s', 1],
  ]) {
    const n = Math.floor(rest / size);
    rest -= n * size;
    if (n > 0) parts.push(`${n}${unit}`);
  }
  return parts.length > 0 ? parts.join(' ') : '0s';
}

/** A span as a clock, "H:MM:SS": 3_735_000 gives "1:02:15". */
export function clock(ms) {
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${s}`;
}
