import validators from "../validators/inputValidators.js";
import { invalidInputError } from "../utils/customError.js";
import { insertUser } from "../services/auth.services.js";

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

    const response = await insertUser(username, email, password);

    console.log("Response:", response);

    // De creat token

    res.status(201).json({
      success: true,
      message: "User successfully created",
      user: response,
    });
  } catch (err) {
    console.log(err.message || err);
    next(err);
  }
};

const login = (req, res) => {
  res.send("Login user");
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
