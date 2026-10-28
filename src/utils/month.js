// accepta 'YYYY-MM' sau 'YYYY-MM-DD' -> 'YYYY-MM-01'; undefined -> null (luna curenta)
// returneaza false daca formatul e invalid
const parseMonth = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const match = /^(\d{4})-(\d{2})(-\d{2})?$/.exec(String(value));
  if (!match) return false;
  const m = Number(match[2]);
  if (m < 1 || m > 12) return false;
  return `${match[1]}-${match[2]}-01`;
};

export { parseMonth };
