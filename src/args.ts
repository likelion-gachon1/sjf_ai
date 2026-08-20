/**
 * 아주 단순한 `--key value` / `--flag` 스타일 인자 파서.
 * 외부 라이브러리 없이 이 프로젝트 규모에 맞는 최소 구현.
 */

export type ParsedArgs = Record<string, string | boolean>;

export function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token || !token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      result[key] = next;
      i++;
    } else {
      result[key] = true;
    }
  }
  return result;
}

export function getStringArg(args: ParsedArgs, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

export function getBoolArg(args: ParsedArgs, key: string): boolean {
  return args[key] === true;
}
