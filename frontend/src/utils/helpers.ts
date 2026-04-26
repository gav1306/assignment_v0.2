export const isString = (value: unknown): value is string => {
  return typeof value === "string" || value instanceof String;
};

export const convertToString = (value: unknown) => {
  return isString(value) ? value : JSON.stringify(value);
};
