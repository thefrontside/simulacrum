import { createHash, randomBytes } from "node:crypto";

// Generate a PKCE verifier/challenge pair the same way MSAL does.
export const createPkcePair = (): { verifier: string; challenge: string } => {
  let verifier = randomBytes(32).toString("base64url");
  let challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
};
