const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = new Set(["upcoming", "completed", "great"]);

export function isValidMonth(month) {
  return MONTH_PATTERN.test(month);
}

export function validateSession(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return ["Session must be an object"];
  if (typeof input.id !== "string" || !input.id.trim() || input.id.length > 100) errors.push("id must be a non-empty string of at most 100 characters");
  if (!Number.isInteger(input.number) || input.number < 1 || input.number > 100) errors.push("number must be an integer between 1 and 100");
  if (typeof input.title !== "string" || input.title.trim().length > 80) errors.push("title must be a string of at most 80 characters");
  if (typeof input.date !== "string" || (input.date && !DATE_PATTERN.test(input.date))) errors.push("date must be empty or use YYYY-MM-DD");
  if (typeof input.note !== "string" || input.note.length > 600) errors.push("note must be a string of at most 600 characters");
  if (!VALID_STATUSES.has(input.status)) errors.push("status must be upcoming, completed, or great");
  return errors;
}

export function cleanSession(input) {
  return {
    id: input.id.trim(),
    number: input.number,
    title: input.title.trim(),
    date: input.date,
    note: input.note.trim(),
    status: input.status,
  };
}
