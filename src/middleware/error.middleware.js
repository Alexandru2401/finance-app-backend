const errorMiddleware = (err, req, res, next) => {
  try {
    // doar ce ajuta la depanare, fara obiectul intreg: erorile Postgres au in
    // `detail` valorile din query (ex. emailul la duplicate key) (security.md 1.5)
    console.error(
      `${req.method} ${req.originalUrl.split("?")[0]} -> ${err.code ?? err.name ?? "Error"}: ${err.message}`,
    );

    // la 500 nu trimitem mesajul intern (ex. erori Postgres) catre client
    const status = err.status || err.statusCode || 500;
    const message =
      status < 500 ? err.message || "Bad request" : "Server error";

    // acelasi format ca in controllere: { success: false, message }
    res.status(status).json({ success: false, message });
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;
