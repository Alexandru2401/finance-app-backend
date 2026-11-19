// calcule pure pt pagina Analytics (GET /budget/costs si /budget/forecast)

// rotunjire la 2 zecimale (bani)
const round2 = (value) => Math.round(value * 100) / 100;

// adauga cota fiecarui rand din totalul listei (0-100, intreg) si totalul
// rows: [{ ..., amount }] -> { items: [{ ..., amount, pct }], total }
const withShares = (rows) => {
  const total = round2(rows.reduce((sum, row) => sum + row.amount, 0));
  return {
    items: rows.map((row) => ({
      ...row,
      pct: total > 0 ? Math.round((row.amount / total) * 100) : 0,
    })),
    total,
  };
};

// 'YYYY-MM' cu `delta` luni fata de `month` ('YYYY-MM'), in UTC
const addMonths = (month, delta) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

// economiile pe luni + prognoza pe urmatoarele `ahead` luni
// prognoza = media economiilor din ultimele 3 luni ale intervalului
// trend: [{ month, savings }], cea mai veche prima
// forecast e setat si pe ultima luna reala (= economiile ei), ca linia
// punctata din grafic sa porneasca de acolo
const savingsForecast = (trend, ahead) => {
  if (trend.length === 0) return { points: [], average: null };

  const points = trend.map((p) => ({
    month: p.month,
    savings: p.savings,
    forecast: null,
  }));

  const recent = trend.slice(-3).map((p) => p.savings);
  const average = round2(recent.reduce((s, n) => s + n, 0) / recent.length);

  const last = points[points.length - 1];
  last.forecast = last.savings;
  for (let i = 1; i <= ahead; i++) {
    points.push({
      month: addMonths(last.month, i),
      savings: null,
      forecast: average,
    });
  }
  return { points, average };
};

export { withShares, savingsForecast };
