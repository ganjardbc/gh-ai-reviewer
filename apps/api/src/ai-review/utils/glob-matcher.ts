export function matchesPattern(path: string, pattern: string): boolean {
  const trimmedPattern = pattern.trim();
  if (!trimmedPattern) return false;

  // Translate wildcard patterns to RegExp
  let regexStr = trimmedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\*\*/g, '___DOUBLE_STAR___') // Placeholder for **
    .replace(/\*/g, '[^/]*')               // * matches non-slash chars
    .replace(/___DOUBLE_STAR___/g, '.*');  // ** matches any char

  const regex = new RegExp(`^${regexStr}$`);

  // If pattern does not contain a slash (e.g. "*.lock"), match against filename
  if (!trimmedPattern.includes('/')) {
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    const baseRegex = new RegExp(`^${regexStr}$`);
    if (baseRegex.test(filename)) {
      return true;
    }
  }

  return regex.test(path);
}

export function isIgnored(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesPattern(path, pattern));
}
