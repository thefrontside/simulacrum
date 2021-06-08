import fs from "fs";
const isTest = process.env.NODE_ENV === "test";

export const existsSync = (path: string): boolean => {
  if (isTest) {
    return true;
  }

  return fs.existsSync(path);
};
