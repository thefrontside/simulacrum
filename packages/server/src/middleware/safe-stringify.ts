export function safeJSONStringify(o: Record<string, unknown>): string {
  try {
    return JSON.stringify(o, null, 4);
  } catch {
    return '';
  }
}
