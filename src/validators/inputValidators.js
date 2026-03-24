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
