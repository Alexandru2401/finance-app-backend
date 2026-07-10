import bcrypt from "bcrypt";
import { SALT_ROUNDS } from "../config/env.js";

const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, parseInt(SALT_ROUNDS));
};

const comparePassword = async (password, userPasssword) => {
  return bcrypt.compare(password, userPasssword);
};

export { hashPassword, comparePassword };
