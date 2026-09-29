import {
  fetchTransactions,
  addNewTransaction,
} from "../services/transactions.services.js";

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

const addTransaction = async (req, res, next) => {
  try {
    const { type, amount, date, categoryId } = req.body;
    console.log(req.user.user_id);
    await addNewTransaction(req.user.user_id, {
      title,
      type,
      amount,
      date,
      categoryId,
    });
    res
      .status(201)
      .json({ success: true, message: "Transaction added successfully" });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

export { getTransactions, addTransaction };
