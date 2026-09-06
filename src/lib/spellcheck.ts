export type SpellcheckSegment = {
  id: string;
  text: string;
};

export type SpellcheckIssue = {
  id: string;
  blockId: string;
  from: number;
  to: number;
  original: string;
  suggestion: string;
  category: string;
  explanation: string | null;
};

type BareunRevision = {
  revised?: unknown;
  category?: unknown;
  help_id?: unknown;
};

type BareunRevisedBlock = {
  origin?: {
    content?: unknown;
    begin_offset?: unknown;
    length?: unknown;
  };
  revised?: unknown;
  revisions?: unknown;
};

type BareunResponse = {
  revised_blocks?: unknown;
  helps?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readHelpComment(helps: unknown, helpId: unknown): string | null {
  if (typeof helpId !== "string") return null;
  const help = asRecord(helps)?.[helpId];
  const comment = asRecord(help)?.comment;
  return typeof comment === "string" && comment.trim() ? comment : null;
}

/**
 * Convert Bareun's provider-shaped response into the small, client-safe shape
 * used by the editor. Invalid offsets are intentionally discarded instead of
 * risking an edit at a wrong position.
 */
export function toSpellcheckIssues(
  blockId: string,
  source: string,
  response: BareunResponse,
): SpellcheckIssue[] {
  if (!Array.isArray(response.revised_blocks)) return [];

  const candidates = response.revised_blocks
    .map((value, index) => {
      const block = value as BareunRevisedBlock;
      const origin = asRecord(block.origin);
      const original = origin?.content;
      const from = origin?.begin_offset;
      const rawLength = origin?.length;
      const revisions = Array.isArray(block.revisions)
        ? (block.revisions as BareunRevision[])
        : [];
      const firstRevision = revisions[0];
      const suggestion =
        typeof block.revised === "string"
          ? block.revised
          : typeof firstRevision?.revised === "string"
            ? firstRevision.revised
            : null;

      if (
        typeof original !== "string" ||
        typeof from !== "number" ||
        !Number.isInteger(from) ||
        typeof suggestion !== "string" ||
        !suggestion ||
        from < 0
      ) {
        return null;
      }

      const length =
        typeof rawLength === "number" && rawLength > 0
          ? rawLength
          : original.length;
      const to = from + length;

      if (
        !Number.isInteger(length) ||
        to > source.length ||
        source.slice(from, to) !== original
      ) {
        return null;
      }

      const category =
        typeof firstRevision?.category === "string"
          ? firstRevision.category
          : "CONFIRM";

      return {
        id: `${blockId}:${from}:${to}:${index}`,
        blockId,
        from,
        to,
        original,
        suggestion,
        category,
        explanation: readHelpComment(response.helps, firstRevision?.help_id),
      } satisfies SpellcheckIssue;
    })
    .filter((issue): issue is SpellcheckIssue => issue !== null)
    .sort((left, right) =>
      left.from === right.from
        ? right.to - right.from - (left.to - left.from)
        : left.from - right.from,
    );

  // Bareun may return nested/overlapping corrections. The outer range is the
  // only safe range to make independently clickable and applicable.
  const accepted: SpellcheckIssue[] = [];
  let lastTo = -1;
  for (const issue of candidates) {
    if (issue.from < lastTo) continue;
    accepted.push(issue);
    lastTo = issue.to;
  }

  return accepted;
}
