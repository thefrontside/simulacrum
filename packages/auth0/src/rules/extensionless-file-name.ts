export const extensionlessFileName = (fileName: string): string =>
  fileName.indexOf(".") === -1
    ? fileName
    : fileName.split(".").slice(0, -1).join(".");
