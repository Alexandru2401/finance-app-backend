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
   * parola nu se face trim; max 72 pt ca bcrypt ignora ce e dupa 72 de bytes
   * @param {string} password
   * @returns {boolean}
   */
  isValidPassword: (password) =>
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 72,

  /**
   * @param {string} value
   * @returns {boolean}
   */
  isValidUUID: (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    ),

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
