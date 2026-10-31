import validators from "../validators/inputValidators.js";
import { invalidInputError } from "../utils/customError.js";
import {
  insertUser,
  fetchUserByEmail,
  fetchUserById,
  fetchUserInfoById,
  insertRefreshToken,
  fetchRefreshToken,
  deleteRefreshToken,
  updateUserProfile,
} from "../services/auth.services.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import {
  createAccesToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../utils/jwtHelperFn.js";

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error = new Error("All fields are required");
      error.status = 400;
      throw error;
    }

    // TO DO = FUNCTIE CUSTOM DE SANITIZARE
    const sanitizedEmail = email.trim().toLowerCase();

    // VALIDARE INPUT-URI
    invalidInputError(
      "Email",
      sanitizedEmail,
      validators.isValidLength,
      validators.isValidEmail,
    );
    if (!validators.isValidPassword(password)) {
      const error = new Error("Password must be between 8 and 72 characters");
      error.status = 400;
      throw error;
    }

    const foundEmail = await fetchUserByEmail(sanitizedEmail);

    if (foundEmail) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await insertUser(sanitizedEmail, hashedPassword);

    // De creat token
    const accessToken = createAccesToken({
      user_id: newUser.user_id,
      email: newUser.email,
      plan_type: newUser.plan_type,
    });

    const refreshToken = createRefreshToken({
      user_id: newUser.user_id,
      email: newUser.email,
      plan_type: newUser.plan_type,
    });

    const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const insertRefrehToken = await insertRefreshToken(
      newUser.user_id,
      refreshToken,
      refreshTokenExpiry,
    );

    if (!insertRefrehToken) {
      return res
        .status(400)
        .json({ success: false, message: "Error at inserting token" });
    }

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: "User successfully created",
      user: newUser,
    });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error = new Error("All fields are required");
      error.status = 400;
      throw error;
    }

    // TO DO = FUNCTIE CUSTOM DE SANITIZARE
    const sanitizedEmail = email.trim().toLowerCase();

    invalidInputError(
      "Email",
      sanitizedEmail,
      validators.isValidLength,
      validators.isValidEmail,
    );
    if (!validators.isValidPassword(password)) {
      const error = new Error("Password must be between 8 and 72 characters");
      error.status = 400;
      throw error;
    }

    const foundedUser = await fetchUserByEmail(sanitizedEmail);

    // acelasi raspuns pt email inexistent si parola gresita (fara user enumeration)
    const isPasswordMatch =
      foundedUser && (await comparePassword(password, foundedUser.password));

    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!foundedUser.is_active) {
      return res
        .status(403)
        .json({ success: false, message: "Account is disabled" });
    }

    // De creat token
    const accessToken = createAccesToken({
      user_id: foundedUser.user_id,
      email: foundedUser.email,
      plan_type: foundedUser.plan_type,
    });
    const refreshToken = createRefreshToken({
      user_id: foundedUser.user_id,
      email: foundedUser.email,
      plan_type: foundedUser.plan_type,
    });

    await insertRefreshToken(
      foundedUser.user_id,
      refreshToken,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    delete foundedUser.password;
    delete foundedUser.is_active;

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: foundedUser,
    });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

const updateUserInfo = async (req, res, next) => {
  try {
    const { username, currency, language } = req.body;

    if (!username || !currency) {
      const error = new Error("Username and currency are required");
      error.status = 400;
      throw error;
    }

    const sanitizedUsername = username.trim();
    invalidInputError("Username", sanitizedUsername, validators.isValidLength);

    // validezi currency contra enum-ului, altfel Postgres arunca 500 urat
    const allowedCurrencies = ["USD", "RON", "EUR"];
    if (!allowedCurrencies.includes(currency)) {
      const error = new Error("Invalid currency");
      error.status = 400;
      throw error;
    }

    // optional; lipsa = ramane limba curenta. Validat contra enum-ului language_code
    const allowedLanguages = ["ro", "en"];
    if (language !== undefined && !allowedLanguages.includes(language)) {
      const error = new Error("Invalid language");
      error.status = 400;
      throw error;
    }

    const updatedUser = await updateUserProfile(
      req.user.user_id,
      sanitizedUsername,
      currency,
      language,
    );

    res.status(200).json({ success: true, user: updatedUser });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // 204 si cand nu exista sesiune: logout-ul e idempotent
    return res.status(204).end();
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// POST /auth/refresh  emite un access token nou pe baza cookie-ului refreshToken
// refresh token-ul ramane acelasi (valabil 30 de zile de la login)
const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res
        .status(401)
        .json({ success: false, message: "No refresh token was provided" });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token" });
    }

    // dupa logout token-ul e sters din db, chiar daca semnatura e inca valida
    const storedToken = await fetchRefreshToken(refreshToken);
    if (!storedToken || storedToken.user_id !== decoded.user_id) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token" });
    }

    // plan_type luat din db, ca sa prinda eventuale schimbari de plan
    const user = await fetchUserInfoById(decoded.user_id);
    if (!user || !user.is_active) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    const accessToken = createAccesToken({
      user_id: user.user_id,
      email: user.email,
      plan_type: user.plan_type,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ success: true, message: "Token refreshed" });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

const checkMe = async (req, res, next) => {
  try {
    const user = await fetchUserById(req.user.user_id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

const getUserInfo = async (req, res, next) => {
  try {
    const user = await fetchUserInfoById(req.user.user_id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

export {
  register,
  login,
  logout,
  refresh,
  checkMe,
  updateUserInfo,
  getUserInfo,
};

//  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
// username            VARCHAR(100) UNIQUE NOT NULL,
// email               VARCHAR(150) UNIQUE NOT NULL,
// password            VARCHAR(255) NOT NULL,
// plan_type           plan_type DEFAULT 'free' NOT NULL,
// is_verified         BOOLEAN DEFAULT FALSE,
// is_active           BOOLEAN DEFAULT TRUE,
// reset_token         VARCHAR(255),
// reset_token_exp     TIMESTAMP,
// created_at          TIMESTAMP DEFAULT NOW(),
// updated_at          TIMESTAMP DEFAULT NOW(),
// last_login          TIMESTAMP
