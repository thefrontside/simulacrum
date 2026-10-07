export const GRAPH_LAUNCHER_ENV = "SIMULACRUM_GRAPH_LAUNCHER";

export type ProcessCommand = {
  executable: string;
  arguments: string[];
};

export function consumeGraphLauncher(): ProcessCommand | undefined {
  // we don't have a clean way to pass this as a value through the child_process
  // so we serialize it as a JSON string in an environment variable.
  // It only adds information and won't break anything if it is missing.
  const raw = process.env[GRAPH_LAUNCHER_ENV];
  delete process.env[GRAPH_LAUNCHER_ENV];
  if (!raw) return undefined;

  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "executable" in value &&
      typeof value.executable === "string" &&
      "arguments" in value &&
      Array.isArray(value.arguments) &&
      value.arguments.every((argument) => typeof argument === "string")
    ) {
      return { executable: value.executable, arguments: value.arguments };
    }
  } catch {
    // Ignore malformed launcher metadata and keep status available.
  }
  return undefined;
}
