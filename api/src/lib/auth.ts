import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const TOKEN_EXPIRY = "30d";

function getSecret(): string {
  return process.env.JWT_SECRET || "dev-secret-change-me";
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function createToken(username: string): string {
  return jwt.sign({ username }, getSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { username: string } | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as { username: string };
    return decoded;
  } catch {
    return null;
  }
}
