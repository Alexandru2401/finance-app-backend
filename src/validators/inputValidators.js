// cea mai mare valoare din coloanele numeric(12,2)
const MAX_AMOUNT = 9999999999.99;

// la fel ca in formularul din FE si ca CHECK-ul din DB
export const NOTES_MAX_LENGTH = 1500;

const validators = {
  /**
   * @param {string} value
   * @returns {boolean}
   */
  isEmpty: (value) => !value || value.trim() === "",

  /**
   * @param {string} email
   * @returns {boolean}
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * @param {string} name
   * @param {number} min
   * @param {number} max
   * @returns {boolean}
   */
  isValidLength: (name, min = 2, max = 150) => {
    return name.trim().length >= min && name.trim().length <= max;
  },

  /**
   * parola nu se face trim; min 8 caractere, max 72 de bytes (bcrypt ignora
   * ce e dupa 72 de bytes; diacriticele si emoji ocupa mai mult de 1 byte)
   * @param {string} password
   * @returns {boolean}
   */
  isValidPassword: (password) =>
    typeof password === "string" &&
    password.length >= 8 &&
    Buffer.byteLength(password, "utf8") <= 72,

  /**
   * nota optionala: undefined, null sau string de max NOTES_MAX_LENGTH dupa trim
   * @param {unknown} notes
   * @returns {boolean}
   */
  isValidNotes: (notes) =>
    notes === undefined ||
    notes === null ||
    (typeof notes === "string" && notes.trim().length <= NOTES_MAX_LENGTH),

  /**
   * @param {string} value
   * @returns {boolean}
   */
  isValidUUID: (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    ),

  /**
   * suma care incape in numeric(12,2) fara sa fie rotunjita; poate fi 0
   * @param {number} amount
   * @returns {boolean}
   */
  isValidAmount: (amount) =>
    Number.isFinite(amount) &&
    amount >= 0 &&
    amount <= MAX_AMOUNT &&
    Math.round(amount * 100) / 100 === amount,

  /**
   * data in format YYYY-MM-DD si care exista in calendar (ex. respinge 2026-02-31)
   * @param {string} value
   * @returns {boolean}
   */
  isValidDate: (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  },

  /**
   * @param {string} username
   * @returns {boolean}
   */
  isValidUserName: (username) => {
    const usernameRegex =
      /^(?=(.*[a-zA-ZÀ-ÖØ-öø-ÿ]){2})[a-zA-ZÀ-ÖØ-öø-ÿ0-9_\-. ]+$/;
    return usernameRegex.test(username.trim());
  },
};

export default validators;
