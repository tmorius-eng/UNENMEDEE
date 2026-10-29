/**
 * Text from outside (a scraped headline, a push service's error body) printed to a GitHub Actions
 * log. The runner reads every line that starts with "::" or "##[" as a workflow command, so a
 * headline carrying a line break could add a fake "::error::" annotation or more. One line, no
 * control characters: it can only ever be the tail of our own line.
 */
export function oneLine(text: unknown, max = 300): string {
  return String(text ?? "")
     
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ")
    .slice(0, max);
}
