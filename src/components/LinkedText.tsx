import { Fragment } from "react";

// https:// URL 전체를 먼저 매칭한 뒤, 말미의 문장부호(마침표·괄호 등)는 링크에서 제외한다.
const URL_RE = /(https:\/\/\S+)/g;
const TRAILING_PUNCT = /[.,;:!?)>»\]]+$/;

function splitUrl(raw: string): { href: string; trailing: string } {
  const m = raw.match(TRAILING_PUNCT);
  if (!m) return { href: raw, trailing: "" };
  return { href: raw.slice(0, m.index), trailing: raw.slice(m.index) };
}

export function LinkedText({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (!part.startsWith("https://")) return part;
        const { href, trailing } = splitUrl(part);
        return (
          <Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-blue-600 underline"
            >
              {href}
            </a>
            {trailing}
          </Fragment>
        );
      })}
    </>
  );
}
