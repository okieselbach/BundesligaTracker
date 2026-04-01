import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import jwt from "jsonwebtoken";

async function debug(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  const secretPrefix = secret.slice(0, 8);

  // Create a test token right here
  const testToken = jwt.sign({ test: true }, secret, { expiresIn: "1h" });

  // Verify our own token
  let selfVerify = "unknown";
  try {
    jwt.verify(testToken, secret);
    selfVerify = "OK";
  } catch (err) {
    selfVerify = `FAIL: ${(err as Error).message}`;
  }

  // Try to verify the token from Authorization header
  let headerVerify = "no token";
  let rawHeader = "none";
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    rawHeader = authHeader;
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    try {
      const decoded = jwt.verify(token, secret);
      headerVerify = `OK: ${JSON.stringify(decoded)}`;
    } catch (err) {
      headerVerify = `FAIL: ${(err as Error).message}`;
      // Also try with trimmed token (in case of whitespace)
      try {
        const decoded = jwt.verify(token.trim(), secret);
        headerVerify += ` | TRIM OK: ${JSON.stringify(decoded)}`;
      } catch {
        headerVerify += " | TRIM also FAIL";
      }
    }
  }

  return {
    status: 200,
    jsonBody: {
      secretPrefix,
      secretLength: secret.length,
      testTokenPrefix: testToken.slice(0, 30),
      selfVerify,
      rawHeaderLength: rawHeader.length,
      rawHeaderPrefix: rawHeader.slice(0, 50),
      headerVerify,
      nodeVersion: process.version,
    },
  };
}

app.http("debug", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "debug",
  handler: debug,
});
