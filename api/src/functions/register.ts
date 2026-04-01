import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { hashPin, createToken } from "../lib/auth.js";
import { uploadJson, blobExists } from "../lib/storage.js";

interface RegisterBody {
  username: string;
  pin: string;
}

async function register(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return { status: 400, jsonBody: { error: "Ungültiger Request Body" } };
  }

  const { username, pin } = body;

  // Validate username: alphanumeric, 3-20 chars (stored lowercase)
  if (!username || !/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return {
      status: 400,
      jsonBody: { error: "Benutzername muss 3-20 Zeichen lang sein (nur Buchstaben und Zahlen)" },
    };
  }

  // Validate PIN: exactly 6 digits
  if (!pin || !/^\d{6}$/.test(pin)) {
    return { status: 400, jsonBody: { error: "PIN muss genau 6 Ziffern haben" } };
  }

  // Check if user already exists
  const userPath = `users/${username}.json`;
  if (await blobExists(userPath)) {
    return { status: 409, jsonBody: { error: "Benutzername ist bereits vergeben" } };
  }

  // Create user
  const pinHash = await hashPin(pin);
  await uploadJson(userPath, {
    username,
    pinHash,
    createdAt: new Date().toISOString(),
  });

  const token = createToken(username);
  return { status: 201, jsonBody: { token } };
}

app.http("register", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "register",
  handler: register,
});
