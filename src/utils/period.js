// valorile acceptate in ?period=
// presetari, calculate in SQL relativ la CURRENT_DATE (luni calendaristice, luna curenta inclusa):
//   this-month | last-month | last-3 | last-6 | last-12
// sau interval custom, ambele capete incluse, acelasi format pe ambele parti:
//   YYYY-MM:YYYY-MM          luni intregi (2026-01:2026-03 = 1 ian - 31 mar)
//   YYYY-MM-DD:YYYY-MM-DD    zile (2026-01-15:2026-03-10)
const PERIOD_PRESETS = ["this-month", "last-month", "last-3", "last-6", "last-12"];

// limita pt intervalul custom, ca un period de 1000 de ani sa nu genereze query-uri uriase
const MAX_YEARS = 10;

const MONTH_RE = /^(\d{4})-(\d{2})$/;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Date UTC daca data exista in calendar (respinge 2026-02-31), altfel null
const toUTCDate = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
};

const toISODate = (date) => date.toISOString().slice(0, 10);

// un capat al intervalului; pt capatul de final intoarce ziua de DUPA (interval [start, end))
const parseBound = (value, isEnd) => {
  let match = MONTH_RE.exec(value);
  if (match) {
    const [year, month] = [Number(match[1]), Number(match[2])];
    if (!toUTCDate(year, month, 1)) return null;
    // Date.UTC trece singur in anul urmator cand month = 12
    const date = isEnd
      ? new Date(Date.UTC(year, month, 1))
      : toUTCDate(year, month, 1);
    return { kind: "month", date };
  }

  match = DAY_RE.exec(value);
  if (match) {
    const date = toUTCDate(Number(match[1]), Number(match[2]), Number(match[3]));
    if (!date) return null;
    if (isEnd) date.setUTCDate(date.getUTCDate() + 1);
    return { kind: "day", date };
  }

  return null;
};

// intoarce { preset } sau { from, to } (to exclusiv, 'YYYY-MM-DD'); false daca e invalid
// fara period => fallback (luna curenta, sau altceva pt rute ca trend)
const parsePeriod = (value, fallback = "this-month") => {
  if (value === undefined || value === "") return { preset: fallback };
  if (typeof value !== "string") return false; // ex. ?period=a&period=b

  if (PERIOD_PRESETS.includes(value)) return { preset: value };

  const parts = value.split(":");
  if (parts.length !== 2) return false;

  const from = parseBound(parts[0], false);
  const to = parseBound(parts[1], true);
  if (!from || !to || from.kind !== to.kind || from.date >= to.date) {
    return false;
  }

  const maxEnd = new Date(from.date);
  maxEnd.setUTCFullYear(maxEnd.getUTCFullYear() + MAX_YEARS);
  if (to.date > maxEnd) return false;

  return { from: toISODate(from.date), to: toISODate(to.date) };
};

export { parsePeriod, PERIOD_PRESETS, MAX_YEARS };
