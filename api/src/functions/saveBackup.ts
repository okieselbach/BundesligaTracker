import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { verifyToken } from "../lib/auth.js";
import { uploadJson } from "../lib/storage.js";

async function saveBackup(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  // Verify JWT
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { status: 401, jsonBody: { error: "Nicht angemeldet" } };
  }

  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) {
    return { status: 401, jsonBody: { error: "Sitzung abgelaufen. Bitte erneut anmelden." } };
  }

  let backupData: unknown;
  try {
    backupData = await request.json();
  } catch {
    return { status: 400, jsonBody: { error: "Ungültige Backup-Daten" } };
  }

  // Save to blob
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
