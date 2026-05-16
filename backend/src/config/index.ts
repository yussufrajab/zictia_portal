import dotenv from "dotenv";

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),

  databaseUrl: process.env.DATABASE_URL || "postgresql://zictia:zictia_dev_pass@localhost:5432/zictia_portal?schema=public",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  jwt: {
    privateKey: process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
    publicKey: process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, "\n") || "",
    accessTokenExpiry: "15m",
    refreshTokenExpiry: "7d",
    algorithm: "RS256" as const,
  },

  passwordPolicy: {
    minLength: parseInt(process.env.PASSWORD_POLICY_MIN_LENGTH || "10", 10),
    historyCount: 5,
    maxAgeDays: parseInt(process.env.PASSWORD_MAX_AGE_DAYS || "90", 10),
  },

  session: {
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || "60", 10),
    rememberDays: 14,
  },

  rateLimit: {
    authenticated: parseInt(process.env.RATE_LIMIT_AUTH || "100", 10),
    unauthenticated: parseInt(process.env.RATE_LIMIT_UNAUTH || "20", 10),
    windowMs: 60 * 1000,
  },

  zanmalipo: {
    baseUrl: process.env.ZANMALIPO_BASE_URL || "https://sandbox.zanmalipo.go.tz",
    apiKey: process.env.ZANMALIPO_API_KEY || "",
  },

  sms: {
    primaryProvider: process.env.SMS_PRIMARY_PROVIDER || "africastalking",
    primaryApiKey: process.env.SMS_PRIMARY_API_KEY || "",
    fallbackProvider: process.env.SMS_FALLBACK_PROVIDER || "",
    fallbackApiKey: process.env.SMS_FALLBACK_API_KEY || "",
    senderId: process.env.SMS_SENDER_ID || "ZICTIA",
  },

  email: {
    smtpHost: process.env.SMTP_HOST || "mail.zictia.go.tz",
    smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "noreply@zictia.go.tz",
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000", 10),
    useSsl: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "zictia",
    secretKey: process.env.MINIO_SECRET_KEY || "zictia_minio_pass",
    bucket: process.env.MINIO_BUCKET || "zictia-portal",
  },

  uploads: {
    maxFileSizeMb: 10,
    maxFilesPerUpload: 5,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "application/pdf", "text/plain", "application/zip"],
  },
};
