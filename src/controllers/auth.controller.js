import { NODE_ENV } from "../config/env.js";
import validators from "../validators/inputValidators.js";
import { invalidInputError } from "../utils/customError.js";
import {
  insertUser,
  fetchUserByEmail,
  fetchUserById,
  fetchUserInfoById,
  insertRefreshToken,
  fetchRefreshToken,
  rotateRefreshToken,
  deleteRefreshToken,
  deleteUserRefreshTokens,
  updateUserProfile,
  fetchUserPasswordById,
  updatePassword,
  resetUserData,
  deleteUserAccount,
} from "../services/auth.services.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import {
  createAccesToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../utils/jwtHelperFn.js";

const ALLOWED_LANGUAGES = ["ro", "en"];

// optiunile comune ale cookie-urilor de sesiune
// secure (doar HTTPS) peste tot in afara de development; NODE_ENV e obligatoriu
// (config/env.js), deci o variabila uitata pe Render nu mai trimite cookie-uri
// fara secure
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: NODE_ENV !== "development",
  sameSite: "strict",
};
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
// paginile din dashboard care au tur ghidat
const ALLOWED_TOURS = [
  "overview",
  "budget",
  "transactions",
  "analytics",
  "settings",
];

const register = async (req, res, next) => {
  try {
    const { email, password, language = "ro" } = req.body;

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
      const error = new Error("Password must be at least 8 characters and at most 72 characters");
      error.status = 400;
      throw error;
    }

    if (!ALLOWED_LANGUAGES.includes(language)) {
      const error = new Error("Invalid language");
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

    const newUser = await insertUser(sanitizedEmail, hashedPassword, language);

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

    const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);

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
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    res.cookie("refreshToken", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
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
      const error = new Error("Password must be at least 8 characters and at most 72 bytes");
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
      new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
    );

    res.cookie("accessToken", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    res.cookie("refreshToken", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
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
    const { username, currency, language, completeOnboarding, completeTour } =
      req.body ?? {};

    if (
      username === undefined &&
      currency === undefined &&
      language === undefined &&
      completeOnboarding === undefined &&
      completeTour === undefined
    ) {
      const error = new Error(
        "Provide at least one field to update: username, currency, language, completeOnboarding, completeTour",
      );
      error.status = 400;
      throw error;
    }

    // finalul onboarding-ului: trimis o singura data, impreuna cu numele si moneda
    if (completeOnboarding !== undefined) {
      if (completeOnboarding !== true) {
        const error = new Error("completeOnboarding can only be true");
        error.status = 400;
        throw error;
      }
      if (username === undefined || currency === undefined) {
        const error = new Error(
          "username and currency are required to complete onboarding",
        );
        error.status = 400;
        throw error;
      }
    }

    // turul ghidat al unei pagini, terminat sau sarit
    if (completeTour !== undefined && !ALLOWED_TOURS.includes(completeTour)) {
      const error = new Error(
        `completeTour must be one of: ${ALLOWED_TOURS.join(", ")}`,
      );
      error.status = 400;
      throw error;
    }

    // optional; lipsa = ramane numele curent
    let sanitizedUsername;
    if (username !== undefined) {
      if (typeof username !== "string") {
        const error = new Error("Username is not valid");
        error.status = 400;
        throw error;
      }
      sanitizedUsername = username.trim();
      invalidInputError(
        "Username",
        sanitizedUsername,
        validators.isValidLength,
      );
    }

    // optional; lipsa = ramane moneda curenta, deci sumele nu se convertesc
    // validezi currency contra enum-ului, altfel Postgres arunca 500 urat
    const allowedCurrencies = ["USD", "RON", "EUR"];
    if (currency !== undefined && !allowedCurrencies.includes(currency)) {
      const error = new Error("Invalid currency");
      error.status = 400;
      throw error;
    }

    // optional; lipsa = ramane limba curenta. Validat contra enum-ului language_code
    if (language !== undefined && !ALLOWED_LANGUAGES.includes(language)) {
      const error = new Error("Invalid language");
      error.status = 400;
      throw error;
    }

    const updatedUser = await updateUserProfile(req.user.user_id, {
      username: sanitizedUsername,
      currency,
      language,
      completeOnboarding: completeOnboarding === true,
      completeTour: completeTour ?? null,
    });

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

    res.clearCookie("accessToken", COOKIE_OPTIONS);
    res.clearCookie("refreshToken", COOKIE_OPTIONS);

    // 204 si cand nu exista sesiune: logout-ul e idempotent
    return res.status(204).end();
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// POST /auth/refresh  emite un access token nou si un refresh token nou
// (rotatie): cel vechi e marcat ca inlocuit. Sesiunea e glisanta: 30 de zile
// de la ultimul refresh. Un token inlocuit folosit din nou dupa perioada de
// gratie (ROTATION_GRACE_SECONDS) inchide toate sesiunile userului
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

    if (storedToken.reused) {
      await deleteUserRefreshTokens(storedToken.user_id);
      res.clearCookie("accessToken", COOKIE_OPTIONS);
      res.clearCookie("refreshToken", COOKIE_OPTIONS);
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

    const payload = {
      user_id: user.user_id,
      email: user.email,
      plan_type: user.plan_type,
    };
    const accessToken = createAccesToken(payload);
    const newRefreshToken = createRefreshToken(payload);

    await rotateRefreshToken(
      refreshToken,
      user.user_id,
      newRefreshToken,
      new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
    );

    res.cookie("accessToken", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    res.cookie("refreshToken", newRefreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
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

const updateUserPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      const error = new Error("Current and new password are required");
      error.status = 400;
      throw error;
    }

    if (!validators.isValidPassword(newPassword)) {
      const error = new Error("Password must be at least 8 characters and at most 72 bytes");
      error.status = 400;
      throw error;
    }

    const user = await fetchUserPasswordById(req.user.user_id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 400, nu 401: la 401/403 frontend-ul incearca un refresh de token
    if (!(await comparePassword(currentPassword, user.password))) {
      const error = new Error("Current password is incorrect");
      error.status = 400;
      throw error;
    }

    const hashedPassword = await hashPassword(newPassword);
    // sesiunea curenta ramane logata, celelalte sunt delogate
    await updatePassword(
      req.user.user_id,
      hashedPassword,
      req.cookies.refreshToken,
    );

    res.status(204).end();
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// Reset Data si Delete Account cer parola curenta, ca o sesiune ramasa
// deschisa pe alt dispozitiv sa nu poata sterge datele
// intoarce un raspuns de eroare sau null daca parola e corecta
const checkPassword = async (req, res) => {
  const { password } = req.body ?? {};
  if (typeof password !== "string" || password === "") {
    return res
      .status(400)
      .json({ success: false, message: "Password is required" });
  }

  const user = await fetchUserPasswordById(req.user.user_id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // 400, nu 401: la 401/403 frontend-ul incearca un refresh de token
  if (!(await comparePassword(password, user.password))) {
    return res
      .status(400)
      .json({ success: false, message: "Password is incorrect" });
  }
  return null;
};

// DELETE /auth/data  body: { password }
// sterge tranzactiile, tintele, recurentele, notificarile si categoriile, apoi
// pune la loc categoriile de pornire; contul si sesiunea raman
const resetData = async (req, res, next) => {
  try {
    const failed = await checkPassword(req, res);
    if (failed) return failed;

    const user = await fetchUserInfoById(req.user.user_id);
    await resetUserData(req.user.user_id, user?.language ?? "ro");

    res.status(204).end();
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

// DELETE /auth/account  body: { password }
// sterge userul cu toate datele si sesiunile, apoi sterge cookie-urile
const deleteAccount = async (req, res, next) => {
  try {
    const failed = await checkPassword(req, res);
    if (failed) return failed;

    await deleteUserAccount(req.user.user_id);

    res.clearCookie("accessToken", COOKIE_OPTIONS);
    res.clearCookie("refreshToken", COOKIE_OPTIONS);

    res.status(204).end();
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

export {
  resetData,
  deleteAccount,
  register,
  login,
  logout,
  refresh,
  checkMe,
  updateUserInfo,
  getUserInfo,
  updateUserPassword,
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
