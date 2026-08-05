function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getConfig() {
  return {
    mongodbUri: required("MONGODB_URI"),
    databaseName: process.env.MONGODB_DB?.trim() || "brightpath",
    adminKey: required("ADMIN_KEY"),
    allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean),
    port: Number(process.env.PORT) || 8000,
  };
}
