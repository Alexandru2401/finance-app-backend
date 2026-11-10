const errorMiddleware = (err, req, res, next) => {
  try {
    let error = { ...err };

    error.message = err.message;

    console.log(err);

    // la 500 nu trimitem mesajul intern (ex. erori Postgres) catre client
    const status = err.status || err.statusCode || 500;
    const message =
      status < 500 ? err.message || "Bad request" : "Server error";

    res.status(status).json({ succes: false, error: message });
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;
