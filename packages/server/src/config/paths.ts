import { homedir } from "os";
import path from "path";

const rootDir = path.join(homedir(), ".simulacrum");
const certificatesDir = path.join(rootDir, "certs");
// TODO: need to check certificates exist and if not dispaly meaningful error
const pemFile = path.join(certificatesDir, "localhost.pem");
const keyFile = path.join(certificatesDir, "localhost-key.pem");

export const paths = {
  rootDir,
  certificatesDir,
  ssl: {
    pemFile,
    keyFile
  }
} as const;
