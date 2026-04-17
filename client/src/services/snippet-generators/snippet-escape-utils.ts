/**
 * Shared escaping utilities for snippet generators.
 * Prevents shell injection and syntax errors in generated code.
 */

/** Escape a string for use inside single-quoted shell arguments (bash/zsh/sh). */
export function escapeShellArg(s: string): string {
  return s.replace(/'/g, "'\\''");
}

/** Escape a string for use inside double-quoted C#/Java/Kotlin strings. */
export function escapeDoubleQuoted(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

/** Escape a string for use inside single-quoted JS/TS string literals. */
export function escapeJsString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

/** Escape a string for use inside single-quoted Python string literals. */
export function escapePythonString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

/** Escape a string for use inside double-quoted PowerShell strings. */
export function escapePowershellString(s: string): string {
  // Backtick MUST be escaped first to avoid double-escaping inserted backticks
  return s.replace(/`/g, '``').replace(/"/g, '`"').replace(/\$/g, '`$');
}

/** Escape a string for use inside single-quoted PowerShell strings (double single-quotes). */
export function escapePowershellSingleQuote(s: string): string {
  return s.replace(/'/g, "''");
}
