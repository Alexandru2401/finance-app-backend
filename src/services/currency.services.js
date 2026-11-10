// cursul oficial BNR - gratuit, fara cheie API, exprimat in RON
// atentie: www.bnr.ro/nbrfxrates.xml face redirect pe homepage, feed-ul e pe curs.bnr.ro
const BNR_URL = "https://curs.bnr.ro/nbrfxrates.xml";
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 ore

let cache = { rates: null, fetchedAt: 0 };

// cati RON valoreaza 1 unitate din fiecare moneda
const getRatesToRon = async () => {
  if (cache.rates && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache.rates;
  }

  let xml;
  try {
    const res = await fetch(BNR_URL);
    if (!res.ok) throw new Error(`BNR responded with ${res.status}`);
    xml = await res.text();
  } catch (err) {
    // daca BNR nu raspunde dar avem un curs mai vechi, il folosim pe ala
    if (cache.rates) return cache.rates;
    const error = new Error("Exchange rates are unavailable, try again later");
    error.status = 503;
    throw error;
  }

  const read = (currency) => {
    const match = xml.match(
      new RegExp(`<Rate currency="${currency}">([\\d.]+)</Rate>`),
    );
    if (!match) {
      const error = new Error(`Missing exchange rate for ${currency}`);
      error.status = 503;
      throw error;
    }
    return Number(match[1]);
  };

  cache = {
    rates: { RON: 1, EUR: read("EUR"), USD: read("USD") },
    fetchedAt: Date.now(),
  };
  return cache.rates;
};

// factorul cu care inmultesti o suma din `from` ca s-o aduci in `to`
// ex: EUR -> USD = (RON per EUR) / (RON per USD)
const getRate = (rates, from, to) => {
  if (from === to) return 1;
  return rates[from] / rates[to];
};

export { getRatesToRon, getRate };
