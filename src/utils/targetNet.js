// net = venituri - cheltuieli (economiile nu se scad), la fel ca la sumele reale
// null daca nu exista target pt venituri si nici pt cheltuieli
const targetNet = (income, expense) =>
  income == null && expense == null ? null : (income ?? 0) - (expense ?? 0);

export { targetNet };
