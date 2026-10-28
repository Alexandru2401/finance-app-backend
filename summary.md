Budget tracker – Summary & targets
Oct 11, 2026 · @Alex
Ce am decis
FE-ul face un singur request, GET /budget/summary?month=YYYY-MM. BE-ul rulează două query-uri în paralel (Promise.all) și întoarce sumele reale, target-ul și procentele.
• Luna selectată e stare de UI, nu se salvează în DB. Filtrul stă în URL (?month=2026-10).
• Luna se trimite ca string YYYY-MM, nu ca Date, ca să nu sară în altă lună din cauza fusului orar. parseMonth (src/utils/month.js) acceptă YYYY-MM sau YYYY-MM-DD, o transformă în YYYY-MM-01 și răspunde cu 400 la orice alt format.
• ?month are prioritate față de ?period (this-month, last-month, last-3, last-6, this-year). Fără niciunul (sau cu un period necunoscut), se ia luna curentă, la fel ca la GET /target. Același lucru e valabil pentru /budget/spending/top.
• Sumele reale vin din budget_items: suma pe income / expense / savings pentru intervalul cerut.
• Target-ul vine din budget_targets: pentru fiecare lună din interval, cel mai recent rând cu month <= luna respectivă (carry-over). Un target setat într-o lună rămâne valabil până îl schimbi. La un interval de mai multe luni (last-3, this-year), target-urile lunilor se adună.
• Procentul se calculează pe BE: real / target * 100, rotunjit la 2 zecimale.
• net = income - expense - savings, la sumele reale, la target și la netBalance din /target.
• Target-ul se setează din GET / POST /target (vezi mai jos), separat de summary.
• Pe FE, un singur useQuery cu queryKey: ["summary", month]. Toate cardurile citesc din el și se actualizează când se schimbă luna.
De făcut acasă
[ ] Verifică ce tipuri au rândurile din septembrie (query-ul de control din secțiunea de mai jos).
[ ] Rulează în Supabase query-ul 1 (sume reale) și query-ul 2 (target) cu user_id-ul tău real și o lună fixă, de exemplu 2026-09-01.
[ ] Compară rezultatul cu ce vezi în tabele: ar trebui să iasă target-ul 4000 / 1000 / 2000 pentru septembrie și 2000 / 500 / 500 pentru octombrie.
[x] Scrie funcțiile în service: fetchBudgetSummary(userId, period, month) și fetchTargetSummary(userId, period, month) în budget.services.js.
[x] Adaugă ?month=YYYY-MM pe GET /budget/summary și GET /budget/spending/top (route → controller → service).
[x] Adaugă GET /target și POST /target (target.routes.js → target.controller.js → target.services.js).
[x] /budget/summary fără month folosește luna curentă, ca GET /target.
[x] Formula pentru net: income - expense - savings.
[ ] Testează în Postman GET /budget/summary pentru septembrie și pentru octombrie, plus un month invalid (2026-13 → 400).
[ ] Testează în Postman POST /target pentru o lună nouă (201) și pentru aceeași lună încă o dată (200).
[ ] Verifică că budget_targets are UNIQUE (user_id, month). POST /target folosește ON CONFLICT (user_id, month) și dă eroare fără el.
[ ] Pe FE: citește month din URL, fallback luna curentă, și fă un useQuery cu ["summary", month].
[ ] Bara de progres: limitează vizual la 100%, dar afișează procentul real (de exemplu 130%).
[ ] Commit pe dev: target.*, utils/month.js și modificările din budget.*.
Query-uri și cod
Înlocuiește user-ul dummy 11111111-1111-1111-1111-111111111111 cu user_id-ul tău real.
Query 1: sumele reale pe lună, din budget_items. FILTER adună separat pe fiecare tip, iar COALESCE pune 0 când nu există niciun item.
SELECT
  COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)  AS income,
  COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense,
  COALESCE(SUM(amount) FILTER (WHERE type = 'savings'), 0) AS savings
FROM budget_items
WHERE user_id = '11111111-1111-1111-1111-111111111111'
  AND date >= '2026-09-01'
  AND date <  '2026-10-01';
Query 2: target-ul valabil pentru lună, din budget_targets. Ia cel mai recent rând care începe în acea lună sau înainte.
SELECT income, expense, savings
FROM budget_targets
WHERE user_id = '11111111-1111-1111-1111-111111111111'
  AND month <= '2026-09-01'
ORDER BY month DESC
LIMIT 1;
Query de control: arată tipurile reale din septembrie. Trebuie să dea aceleași cifre ca query-ul 1, așezate pe rânduri.
SELECT type, SUM(amount), COUNT(*)
FROM budget_items
WHERE date >= '2026-09-01' AND date < '2026-10-01'
GROUP BY type;
Service (budget.services.js): target-ul pe interval, cu carry-over pe fiecare lună. Pentru ?month, $2 e 'YYYY-MM-01' și intervalul are o singură lună.
WITH months AS (
  SELECT generate_series(
    $2::date,
    ($2::date + INTERVAL '1 month') - INTERVAL '1 month',
    INTERVAL '1 month'
  )::date AS month
)
SELECT SUM(t.income) AS income, SUM(t.expense) AS expense,
       SUM(t.savings) AS savings
FROM months m
LEFT JOIN LATERAL (
  SELECT income, expense, savings FROM budget_targets
  WHERE user_id = $1 AND month <= m.month
  ORDER BY month DESC
  LIMIT 1
) t ON TRUE;
Controller (budget.controller.js): procentul, null când nu există target sau target-ul e 0.
const percentOf = (actual, target) =>
  target > 0 ? Math.round((actual / target) * 10000) / 100 : null;
Exemplu de răspuns pentru GET /budget/summary?month=2026-09 (cu tipuri presupuse pentru items):
{
  "success": true,
  "summary": {
    "income": 4833, "expense": 2233, "savings": 2333, "net": 267,
    "target":   { "income": 4000, "expense": 1000, "savings": 2000, "net": 1000 },
    "progress": { "income": 120.83, "expense": 223.3, "savings": 116.65, "net": 26.7 }
  }
}
Target-uri: GET /target, GET /target/all și POST /target
• GET /target/all întoarce toate target-urile salvate ale userului, cele mai noi primele. Lunile moștenite nu apar, doar rândurile din budget_targets.
• GET /target?month=YYYY-MM (implicit luna curentă) întoarce mereu un rând. Dacă luna nu are target propriu, îl moștenește pe ultimul dinainte, fără să-l salveze în DB: id e null, iar inheritedFrom e luna din care vine.
• POST /target cu body { month?, income?, expense?, savings? } face upsert pe (user_id, month). Câmpurile trebuie să fie numere >= 0 și e obligatoriu cel puțin unul.
• La o lună nouă (201), câmpurile netrimise se copiază din ultimul target dinainte. La o lună existentă (200), câmpurile netrimise își păstrează valoarea.
Exemplu de răspuns pentru GET /target?month=2026-11 (fără target propriu în noiembrie):
{
  "success": true,
  "target": {
    "id": null, "month": "2026-11-01", "inheritedFrom": "2026-10-01",
    "income": 2000, "expense": 500, "savings": 500, "netBalance": 1000
  }
}
Cazuri limită
• Fără target pentru lună (de exemplu iunie, înainte de primul rând): câmpurile din target și din progress sunt null. FE-ul afișează „Setează un target” în loc de bară.
• Target 0: procentul e null, nu Infinity sau NaN.
• Peste 100%: API-ul trimite valoarea reală (130%). Doar bara de pe FE se limitează vizual la 100%.
• Expense are sens invers: la expense, peste 100% înseamnă depășirea limitei, deci roșu. La income și savings, peste 100% e bine.
• pg întoarce SUM pe numeric ca string: convertește cu Number(...), altfel "1500" + "200" dă "1500200". Controllerele fac deja asta.
• month în budget_targets trebuie să fie mereu prima zi a lunii. Altfel month <= '2026-10-01' ratează un rând salvat cu 2026-10-15. Prin API e garantat (parseMonth + date_trunc), dar un insert manual în Supabase poate strica regula. Adaugă CHECK (EXTRACT(DAY FROM month) = 1) ca s-o impui și în DB.
• Rânduri vechi cu category_id = NULL (255, 320.50, 5000): intră normal în sume. Curăță-le doar dacă vrei să faci categoria obligatorie.
