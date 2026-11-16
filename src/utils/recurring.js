// Datele tranzactiilor recurente (notification.md -> "Calculul primei date").
// Toate datele sunt 'YYYY-MM-DD'; calculele se fac in UTC ca sa nu depinda de
// fusul serverului, iar "azi" e ziua din Romania.

const TIME_ZONE = "Europe/Bucharest";

// 'YYYY-MM-DD' pentru ziua de azi in Romania (en-CA formateaza exact asa)
const todayInRomania = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());

const pad = (n) => String(n).padStart(2, "0");

// monthIndex 0-11; Date.UTC trece singur in anul urmator / anterior
const toDateString = (year, monthIndex, day) => {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const daysInMonth = (year, monthIndex) =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

// ziua aleasa in luna data; 29-31 in lunile mai scurte = ultima zi a lunii
const onDay = (year, monthIndex, day) =>
  toDateString(year, monthIndex, Math.min(day, daysInMonth(year, monthIndex)));

const parse = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return { year, monthIndex: month - 1, day };
};

// prima data la care se genereaza tranzactia, mereu in viitor (nu retroactiv):
// - fara zi (null): 1 a lunii urmatoare
// - cu zi: acea zi din luna curenta daca e dupa azi, altfel din luna urmatoare
const nextRunDate = (dayOfMonth, today = todayInRomania()) => {
  const { year, monthIndex } = parse(today);

  if (dayOfMonth == null) return toDateString(year, monthIndex + 1, 1);

  const thisMonth = onDay(year, monthIndex, dayOfMonth);
  return thisMonth > today ? thisMonth : onDay(year, monthIndex + 1, dayOfMonth);
};

export { todayInRomania, nextRunDate };
