import { fetchTransactions } from "../services/transactions.services.js";

// GET /transactions  (?type=expense&categoryId=..&year=..&month=..&day=..&minAmount=..&maxAmount=..&search=..&sort=newest&page=1&perPage=10)
const getTransactions = async (req, res, next) => {
  try {
    const {
      search,
      type,
      categoryId,
      year,
      month,
      day,
      minAmount,
      maxAmount,
      sort,
      page,
      perPage,
    } = req.query;

    const { rows, total, net } = await fetchTransactions(req.user.user_id, {
      search,
      type,
      categoryId,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      day: day ? Number(day) : undefined,
      minAmount: minAmount != null ? Number(minAmount) : undefined,
      maxAmount: maxAmount != null ? Number(maxAmount) : undefined,
      sort,
      page,
      perPage,
    });

    res.status(200).json({ success: true, transactions: rows, total, net });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

export { getTransactions };
