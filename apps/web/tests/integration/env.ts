// Runs in every integration worker before test files are imported.
if (process.env.MOTOSCOPE_TEST_DB) process.env.DATABASE_URL = process.env.MOTOSCOPE_TEST_DB;
process.env.RATE_LIMIT_PUBLIC_PER_MINUTE ??= "100000";
process.env.RATE_LIMIT_AUTH_PER_MINUTE ??= "100000";
process.env.AUTH_SECURE_COOKIE = "false";
