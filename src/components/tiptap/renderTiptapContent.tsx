import { type Extensions, type JSONContent } from "@tiptap/core";
import { type Mark, type Node } from "@tiptap/pm/model";
import { type ReactNode } from "react";

import { type TiptapStaticRendererOptions } from "./internal/json/renderer";
import { renderToReactElement } from "./internal/pm/react";
import { sanitizeContent } from "./sanitize";

export const renderTiptapContent = ({
  content,
  extensions,
  rootClassName,
  options,
}: {
  content: JSONContent;
  extensions: Extensions;
  rootClassName?: string;
  options: Partial<TiptapStaticRendererOptions<React.ReactNode, Mark, Node>>;
}): ReactNode => {
  const sanitizedContent = sanitizeContent(content, extensions);

  return renderToReactElement({
    extensions,
    rootClassName,
    options,
    content: sanitizedContent,
  });
};
