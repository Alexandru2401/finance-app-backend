import validators from "../validators/inputValidators.js";
import { invalidInputError } from "../utils/customError.js";
import {
  insertUser,
  fetchUserByEmail,
  fetchUserByUsername,
} from "../services/auth.services.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    console.log(username, email, password);

    if (!username || !email || !password) {
      const error = new Error("All fields are required");
      error.status = 400;
      throw error;
    }

    // TO DO = FUNCTIE CUSTOM DE SANITIZARE
    const sanitizedUsername = username.trim().toLowerCase();
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password.trim();

    const foundUsername = await fetchUserByUsername(sanitizedUsername);
    console.log("Found username", foundUsername);

    if (foundUsername) {
      return res
        .status(409)
        .json({ success: false, message: "Username already exists" });
    }

    const foundEmail = await fetchUserByEmail(sanitizedEmail);
    console.log("Found user", foundEmail);

    if (foundEmail) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }

    // VALIDARE INPUT-URI
    invalidInputError(
      "Username",
      sanitizedUsername,
      validators.isValidLength,
      validators.isValidUserName,
    );
    invalidInputError(
      "Email",
      sanitizedEmail,
      validators.isValidLength,
      validators.isValidEmail,
    );
    invalidInputError("Password", sanitizedPassword, validators.isValidLength);

    const hashedPassword = await hashPassword(sanitizedPassword);

    const newUser = await insertUser(
      sanitizedUsername,
      sanitizedEmail,
      hashedPassword,
    );

    console.log(newUser);

    // De creat token

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
    console.log(email, password);

    if (!email || !password) {
      const error = new Error("All fields are required");
      error.status = 400;
      throw error;
    }

    // TO DO = FUNCTIE CUSTOM DE SANITIZARE
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password.trim();

    const foundedUser = await fetchUserByEmail(sanitizedEmail);
    console.log("Found user", foundedUser);

    if (!foundedUser) {
      return res
        .status(404)
        .json({ success: false, message: "Email not found" });
    }

    console.log(foundedUser.password, sanitizedPassword);

    const isPasswordMatch = await comparePassword(
      sanitizedPassword,
      foundedUser.password,
    );

    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // De creat token

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
const logout = (req, res) => {
  res.send("Logut user");
};

export { register, login, logout };

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
