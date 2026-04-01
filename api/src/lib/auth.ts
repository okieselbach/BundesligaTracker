import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_EXPIRY = "30d";

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function createToken(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { username: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
    return decoded;
  } catch {
    return null;
  }
}
