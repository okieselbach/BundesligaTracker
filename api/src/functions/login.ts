import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { verifyPin, createToken } from "../lib/auth.js";
import { downloadJson, blobExists } from "../lib/storage.js";

interface LoginBody {
  username: string;
  pin: string;
}

interface UserData {
  username: string;
  pinHash: string;
  createdAt: string;
}

interface BackupMeta {
  exportedAt?: string;
}

// Simple in-memory rate limiting
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

async function login(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (isRateLimited(ip)) {
    return { status: 429, jsonBody: { error: "Zu viele Versuche. Bitte warte eine Minute." } };
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return { status: 400, jsonBody: { error: "Ungültiger Request Body" } };
  }

  const { username, pin } = body;
  if (!username || !pin) {
    return { status: 400, jsonBody: { error: "Benutzername und PIN erforderlich" } };
  }

  const userPath = `users/${username.toLowerCase()}.json`;
  const userData = await downloadJson<UserData>(userPath);
  if (!userData) {
    return { status: 401, jsonBody: { error: "Benutzername oder PIN falsch" } };
  }

  const valid = await verifyPin(pin, userData.pinHash);
  if (!valid) {
    return { status: 401, jsonBody: { error: "Benutzername oder PIN falsch" } };
  }

  // Check if backup exists and get timestamp
  let lastBackupAt: string | null = null;
  const backupPath = `backups/${username.toLowerCase()}/latest.json`;
  if (await blobExists(backupPath)) {
    const backup = await downloadJson<BackupMeta>(backupPath);
    lastBackupAt = backup?.exportedAt ?? null;
  }

  const token = createToken(username.toLowerCase());
  return { status: 200, jsonBody: { token, lastBackupAt } };
}

app.http("login", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "login",
  handler: login,
});
