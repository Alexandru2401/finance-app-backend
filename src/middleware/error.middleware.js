const errorMiddleware = (err, req, res, next) => {
  try {
    let error = { ...err };

    error.message = err.message;

    console.log(err);

    res
      .status(err.status || 500)
      .json({ succes: false, error: err.message || "Server error" });
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;
