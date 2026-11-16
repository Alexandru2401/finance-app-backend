// Budget Health: scor 0-100 din 4 componente (analitycs.md).
// Functie pura: primeste totalurile si intoarce scorul; nu citeste din DB.
// Pragurile sunt alegeri de produs; se ajusteaza dupa scoruri pe date reale.

const LABELS = [
  { min: 80, label: "excellent" },
  { min: 60, label: "good" },
  { min: 40, label: "warning" },
  { min: 0, label: "risk" },
];

// primele zile din luna: ritmul si proiectia nu spun nimic inca
const EARLY_DAYS = 5;

const round2 = (n) => Math.round(n * 100) / 100;

// `value` intre `best` (puncte maxime) si `worst` (0 puncte), liniar
const linear = (value, best, worst, max) => {
  if (value <= best) return max;
  if (value >= worst) return 0;
  return max * (1 - (value - best) / (worst - best));
};

const average = (values) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;

/**
 * @param {object} input
 * @param {number} input.day             ziua de azi din luna (1-31)
 * @param {number} input.daysInMonth     zilele lunii curente
 * @param {number} input.spentSoFar      cheltuieli din luna curenta, pana azi
 * @param {number|null} input.expenseTarget  tinta de cheltuieli a lunii curente
 * @param {{income:number, expense:number, savings:number, count:number}[]} input.lastMonths
 *        ultimele 3 luni complete, cea mai recenta ULTIMA; count = nr. tranzactii
 * @param {number|null} input.savingsTarget  tinta de economii a lunii trecute (suma)
 * @returns {{ score: number|null, label: string|null, components: object[] }}
 */
const computeBudgetHealth = ({
  day,
  daysInMonth,
  spentSoFar,
  expenseTarget,
  lastMonths,
  savingsTarget,
}) => {
  const withData = lastMonths.filter((m) => m.count > 0);

  // fara nicio luna completa cu tranzactii nu exista scor
  if (withData.length === 0) {
    return { score: null, label: null, components: [] };
  }

  const early = day <= EARLY_DAYS;
  const avgExpense = average(withData.map((m) => m.expense));
  const components = [];

  // 1. Ritmul cheltuielilor in luna curenta (35 p)
  // baza = tinta de cheltuieli sau, fara ea, media ultimelor luni complete
  const paceBase = expenseTarget > 0 ? expenseTarget : avgExpense;
  if (!early && paceBase > 0) {
    const expected = (paceBase * day) / daysInMonth;
    const pace = spentSoFar / expected;
    components.push({
      key: "pace",
      points: linear(pace, 1, 1.5, 35),
      max: 35,
      values: {
        spent: round2(spentSoFar),
        base: round2(paceBase),
        expected: round2(expected),
        fromTarget: expenseTarget > 0,
        pace: round2(pace),
      },
    });
  }

  // 2. Rata de economisire pe ultima luna completa (25 p)
  // rata = economii / venituri, aceeasi formula ca in Insights (pagina Budget)
  const last = lastMonths[lastMonths.length - 1];
  if (last && last.count > 0) {
    // tinta de economii e o suma: devine procent din veniturile lunii
    const goal =
      savingsTarget > 0 && last.income > 0
        ? Math.min(Math.max(savingsTarget / last.income, 0.01), 1)
        : 0.2;
    const rate = last.income > 0 ? last.savings / last.income : 0;
    components.push({
      key: "savingsRate",
      // rata >= tinta -> 25 p, intre 0 si tinta liniar, <= 0 -> 0
      points: last.income > 0 ? 25 * Math.min(Math.max(rate / goal, 0), 1) : 0,
      max: 25,
      values: {
        ratePct: Math.round(rate * 100),
        goalPct: Math.round(goal * 100),
        fromTarget: savingsTarget > 0 && last.income > 0,
        noIncome: last.income === 0,
      },
    });
  }

  // 3. Sold pozitiv pe ultimele luni complete cu date (20 p)
  // 3/3 = 20, 2/3 = 13, 1/3 = 7; lunile fara tranzactii nu se numara
  const positive = withData.filter((m) => m.income >= m.expense).length;
  components.push({
    key: "positiveMonths",
    points: Math.round((20 * positive) / withData.length),
    max: 20,
    values: { positive, months: withData.length },
  });

  // 4. Tendinta fata de propria medie (20 p)
  if (!early && avgExpense > 0) {
    const projection = (spentSoFar / day) * daysInMonth;
    const delta = projection / avgExpense - 1;
    components.push({
      key: "trend",
      points: linear(delta, 0, 0.25, 20),
      max: 20,
      values: {
        projection: round2(projection),
        average: round2(avgExpense),
        deltaPct: Math.round(delta * 100),
      },
    });
  }

  // componentele lipsa se exclud, iar scorul se rescaleaza la 100
  const max = components.reduce((s, c) => s + c.max, 0);
  const points = components.reduce((s, c) => s + c.points, 0);
  const score = Math.round((points / max) * 100);

  return {
    score,
    label: LABELS.find((l) => score >= l.min).label,
    // cele mai problematice primele (cele mai multe puncte pierdute)
    components: components
      .map((c) => ({ ...c, points: Math.round(c.points * 10) / 10 }))
      .sort((a, b) => b.max - b.points - (a.max - a.points)),
  };
};

export { computeBudgetHealth };
