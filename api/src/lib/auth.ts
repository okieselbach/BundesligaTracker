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

export function verifyToken(token: string): { user: { username: string } | null; error: string | null } {
  try {
    const secret = getSecret();
    const decoded = jwt.verify(token, secret) as { username: string };
    return { user: decoded, error: null };
  } catch (err) {
    const secret = getSecret();
    return { user: null, error: `${(err as Error).message} [secret=${secret.slice(0, 4)}..., tokenStart=${token.slice(0, 20)}]` };
  }
}
