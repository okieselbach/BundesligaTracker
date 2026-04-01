import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { verifyToken } from "../lib/auth.js";
import { downloadJson } from "../lib/storage.js";

async function loadBackup(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  // Verify JWT
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { status: 401, jsonBody: { error: "Nicht angemeldet" } };
  }

  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) {
    return { status: 401, jsonBody: { error: "Sitzung abgelaufen. Bitte erneut anmelden." } };
  }

  const blobPath = `backups/${decoded.username}/latest.json`;
  const data = await downloadJson(blobPath);

  if (!data) {
    return { status: 404, jsonBody: { error: "Kein Backup gefunden" } };
  }

  return { status: 200, jsonBody: data };
}

app.http("loadBackup", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "backup",
  handler: loadBackup,
});
