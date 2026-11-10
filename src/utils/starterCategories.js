// Categoriile primite de fiecare user nou, in limba contului.
// Dupa creare sunt categorii obisnuite: userul le poate redenumi sau sterge.
const STARTER_CATEGORIES = [
  { type: "income", ro: "Salariu", en: "Salary" },
  { type: "income", ro: "Freelance", en: "Freelance" },
  { type: "income", ro: "Investiții", en: "Investments" },
  { type: "income", ro: "Altele", en: "Other" },
  { type: "expense", ro: "Mâncare", en: "Groceries" },
  { type: "expense", ro: "Locuință", en: "Housing" },
  { type: "expense", ro: "Transport", en: "Transport" },
  { type: "expense", ro: "Altele", en: "Other" },
  { type: "savings", ro: "Fond de urgență", en: "Emergency Fund" },
  { type: "savings", ro: "Vacanță", en: "Vacation" },
  { type: "savings", ro: "Pensie", en: "Retirement" },
  { type: "savings", ro: "Altele", en: "Other" },
];

export default STARTER_CATEGORIES;
