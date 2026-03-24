const invalidInputError = (label, value, ...validators) => {
  const isInvalid = validators.some((fn) => !fn(value));

  if (isInvalid) {
    const error = new Error(`${label} is not valid`);
    error.status = 400;
    throw error;
  }
};

export { invalidInputError };
