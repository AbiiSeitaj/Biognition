export type DiffSegment = { type: "equal" | "delete" | "insert"; text: string };

/** Split text into words and whitespace tokens for readable diffs. */
function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? [];
}

function joinTokens(tokens: string[]): string {
  return tokens.join("");
}

/** Word-level LCS diff between original (AI) and revised (radiologist) text. */
export function diffText(original: string, revised: string): DiffSegment[] {
  const a = tokenize(original.trim());
  const b = tokenize(revised.trim());
  if (a.length === 0 && b.length === 0) return [];
  if (a.join("") === b.join("")) return [{ type: "equal", text: original }];

  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const raw: DiffSegment[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      raw.unshift({ type: "equal", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.unshift({ type: "insert", text: b[j - 1] });
      j--;
    } else {
      raw.unshift({ type: "delete", text: a[i - 1] });
      i--;
    }
  }

  return mergeSegments(raw);
}

function mergeSegments(parts: DiffSegment[]): DiffSegment[] {
  const merged: DiffSegment[] = [];
  for (const part of parts) {
    const last = merged[merged.length - 1];
    if (last && last.type === part.type) last.text += part.text;
    else merged.push({ ...part });
  }
  return merged;
}

/** Segments to render on the AI column: equal text + deletions highlighted. */
export function aiDiffSegments(original: string, revised: string): DiffSegment[] {
  if (!original.trim()) return [{ type: "equal", text: original || "—" }];
  if (original === revised) return [{ type: "equal", text: original }];
  return diffText(original, revised).filter((s) => s.type !== "insert");
}

/** Segments to render on the radiologist column: equal text + insertions. */
export function humanDiffSegments(original: string, revised: string): DiffSegment[] {
  if (!revised.trim()) return [{ type: "equal", text: revised || "—" }];
  if (original === revised) return [{ type: "equal", text: revised }];
  return diffText(original, revised).filter((s) => s.type !== "delete");
}

export function hasTextDiff(original: string, revised: string): boolean {
  return original.trim() !== revised.trim();
}
