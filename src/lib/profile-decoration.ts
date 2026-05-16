export const PROFILE_DECORATION_OPTIONS = [
  { id: "none", label: "없음" },
  { id: "cat", label: "고양이" },
  { id: "dog", label: "강아지" },
  { id: "cap", label: "모자" },
  { id: "flower", label: "꽃" },
  { id: "crown", label: "왕관" },
  { id: "ribbon", label: "리본" },
  { id: "star", label: "별" },
  { id: "mic", label: "마이크" },
  { id: "beard", label: "수염" },
  { id: "glasses", label: "안경" },
  { id: "sun-glasses", label: "선글라스" },
  { id: "sprout", label: "새싹" },
] as const;

export type ProfileDecoration =
  (typeof PROFILE_DECORATION_OPTIONS)[number]["id"];

export const DEFAULT_PROFILE_DECORATION: ProfileDecoration = "none";

const decorationIds = new Set<string>(
  PROFILE_DECORATION_OPTIONS.map((option) => option.id),
);

export function normalizeProfileDecoration(
  value?: string | null,
): ProfileDecoration {
  return decorationIds.has(value ?? "")
    ? (value as ProfileDecoration)
    : DEFAULT_PROFILE_DECORATION;
}

export function getProfileDecorationLabel(decoration: string) {
  return (
    PROFILE_DECORATION_OPTIONS.find((option) => option.id === decoration)
      ?.label ?? PROFILE_DECORATION_OPTIONS[0].label
  );
}
