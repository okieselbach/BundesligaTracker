import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { verifyToken } from "../lib/auth.js";
import { uploadJson } from "../lib/storage.js";

async function saveBackup(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const token = request.headers.get("x-auth-token");
  if (!token) {
    return { status: 401, jsonBody: { error: "Nicht angemeldet" } };
  }

  const { user: decoded, error: tokenError } = verifyToken(token);
  if (!decoded) {
    return { status: 401, jsonBody: { error: `Auth: ${tokenError}` } };
  }

  let backupData: unknown;
  try {
    backupData = await request.json();
  } catch {
    return { status: 400, jsonBody: { error: "Ungültige Backup-Daten" } };
  }

  const blobPath = `backups/${decoded.username}/latest.json`;
  await uploadJson(blobPath, backupData);

  return { status: 200, jsonBody: { savedAt: new Date().toISOString() } };
}

app.http("saveBackup", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "backup/save",
  handler: saveBackup,
});
