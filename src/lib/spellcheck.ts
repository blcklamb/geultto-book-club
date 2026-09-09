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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function invalidResponse(): never {
  throw new Error("provider_invalid_response");
}

function readHelpComment(helps: unknown, helpId: unknown): string | null {
  if (typeof helpId !== "string") return null;
  const help = asRecord(helps)?.[helpId];
  const comment = asRecord(help)?.comment;
  return typeof comment === "string" && comment.trim() ? comment : null;
}

/**
 * Convert Bareun's provider-shaped response into the small, client-safe shape
 * used by the editor. Connect's JSON uses camelCase; accept the documented
 * protobuf snake_case spelling too. Invalid results must not mean "no errors".
 */
export function toSpellcheckIssues(
  blockId: string,
  source: string,
  value: unknown,
): SpellcheckIssue[] {
  const response = asRecord(value);
  if (!response) return invalidResponse();
  if (response.origin !== undefined && response.origin !== source) {
    return invalidResponse();
  }
  const blocks = response.revisedBlocks ?? response.revised_blocks;
  if (blocks === undefined) {
    // Protobuf JSON may omit an empty repeated field. Only treat that as a
    // clean result when the provider explicitly returns the unchanged text.
    if (response.origin === source && response.revised === source) return [];
    return invalidResponse();
  }
  if (!Array.isArray(blocks)) return invalidResponse();
  if (blocks.length === 0 && response.revised !== undefined && response.revised !== source) {
    return invalidResponse();
  }

  const candidates = blocks
    .map((value, index) => {
      const block = asRecord(value);
      if (!block) return invalidResponse();
      const origin = asRecord(block.origin);
      const original = origin?.content;
      // Zero-valued protobuf scalar fields may also be omitted.
      const from = origin?.beginOffset ?? origin?.begin_offset ?? 0;
      const rawLength = origin?.length;
      if (block.revisions !== undefined && !Array.isArray(block.revisions)) {
        return invalidResponse();
      }
      const revisions = Array.isArray(block.revisions) ? block.revisions : [];
      const firstRevision = asRecord(revisions[0]);
      const suggestion =
        typeof block.revised === "string"
          ? block.revised
          : typeof firstRevision?.revised === "string"
            ? firstRevision.revised
            : null;

      if (
        typeof original !== "string" ||
        original.length === 0 ||
        typeof from !== "number" ||
        !Number.isInteger(from) ||
        typeof suggestion !== "string" ||
        from < 0
      ) {
        return invalidResponse();
      }

      if (rawLength !== undefined &&
        (typeof rawLength !== "number" || !Number.isInteger(rawLength) || rawLength < 0)) {
        return invalidResponse();
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
        return invalidResponse();
      }
      if (original === suggestion) return null;

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
        explanation: readHelpComment(
          response.helps,
          firstRevision?.helpId ?? firstRevision?.help_id,
        ),
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
