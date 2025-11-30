import { type Extensions, type JSONContent } from "@tiptap/core";
import { type DOMOutputSpec, type Mark, type Node } from "@tiptap/pm/model";
import { createElement, Fragment } from "react";

import { renderJSONContentToReactElement } from "../../json/react/react";
import { type TiptapStaticRendererOptions } from "../../json/renderer";
import { type DOMOutputSpecArray } from "../../types";
import { renderToElement } from "../extensionRenderer";

/**
 * This function maps the attributes of a node or mark to HTML attributes
 * @param attrs The attributes to map
 * @returns The mapped HTML attributes as an object
 */
function mapAttrsToHTMLAttributes(
  attrs?: Record<string, any>
): Record<string, any> {
  if (!attrs) {
    return {};
  }

  const reactAttrMap: Record<string, string> = {
    class: "className",
    colspan: "colSpan",
    rowspan: "rowSpan",
    for: "htmlFor",
    tabindex: "tabIndex",
    readonly: "readOnly",
  };

  return Object.entries(attrs).reduce((acc, [name, value]) => {
    const reactName = reactAttrMap[name] ?? name;

    if (reactName === "style" && typeof value === "string") {
      acc.style = value
        .split(";")
        .filter(Boolean)
        .reduce((styleObj, styleRule) => {
          const [prop, val] = styleRule.split(":");
          if (!prop || !val) {
            return styleObj;
          }

          const camelCaseProp = prop
            .trim()
            .replace(/-([a-z])/g, (_, char) => char.toUpperCase());

          // @ts-ignore
          styleObj[camelCaseProp] = val.trim();
          return styleObj;
        }, {} as React.CSSProperties);
    } else {
      acc[reactName] = value;
    }

    return acc;
  }, {} as Record<string, any>);
}
/**
 * Take a DOMOutputSpec and return a function that can render it to a React element
 * @param content The DOMOutputSpec to convert to a React element
 * @returns A function that can render the DOMOutputSpec to a React element
 */
export function domOutputSpecToReactElement(
  content: DOMOutputSpec
): (children?: React.ReactNode) => React.ReactNode {
  if (typeof content === "string") {
    return () => content;
  }
  if (typeof content === "object" && "length" in content) {
    // eslint-disable-next-line prefer-const
    let [tag, attrs, children, ...rest] = content as DOMOutputSpecArray;
    const parts = tag.split(" ");

    if (parts.length > 1) {
      tag = parts[1]!;
      if (attrs === undefined) {
        attrs = {
          xmlns: parts[0],
        };
      }
      if (attrs === 0) {
        attrs = {
          xmlns: parts[0],
        };
        children = 0;
      }
      if (typeof attrs === "object") {
        attrs = Object.assign(attrs, { xmlns: parts[0] });
      }
    }

    if (attrs === undefined) {
      return () =>
        createElement(tag, {
          ...mapAttrsToHTMLAttributes(undefined),
        });
    }
    if (attrs === 0) {
      return (child) =>
        createElement(tag, { ...mapAttrsToHTMLAttributes(undefined) }, child);
    }
    if (typeof attrs === "object") {
      if (Array.isArray(attrs)) {
        if (children === undefined) {
          return (child) =>
            createElement(
              tag,
              { ...mapAttrsToHTMLAttributes(undefined) },
              domOutputSpecToReactElement(attrs as DOMOutputSpecArray)(child)
            );
        }
        if (children === 0) {
          return (child) =>
            createElement(
              tag,
              { ...mapAttrsToHTMLAttributes(undefined) },
              domOutputSpecToReactElement(attrs as DOMOutputSpecArray)(child)
            );
        }
        return (child) =>
          createElement(
            tag,
            { ...mapAttrsToHTMLAttributes(undefined) },
            domOutputSpecToReactElement(attrs as DOMOutputSpecArray)(child),
            [children]
              .concat(rest)
              .map((outputSpec) =>
                domOutputSpecToReactElement(outputSpec)(child)
              )
          );
      }
      if (children === undefined) {
        return () =>
          createElement(tag, {
            ...mapAttrsToHTMLAttributes(attrs),
          });
      }
      if (children === 0) {
        return (child) =>
          createElement(tag, { ...mapAttrsToHTMLAttributes(attrs) }, child);
      }

      return (child) =>
        createElement(
          tag,
          { ...mapAttrsToHTMLAttributes(attrs) },
          [children]
            .concat(rest)
            .map((outputSpec) => domOutputSpecToReactElement(outputSpec)(child))
        );
    }
  }

  throw new Error(
    "[tiptap error]: Unsupported DomOutputSpec type, check the `renderHTML` method output or implement a node mapping",
    {
      cause: content,
    }
  );
}

/**
 * This function will statically render a Prosemirror Node to a React component using the given extensions
 * @param content The content to render to a React component
 * @param extensions The extensions to use for rendering
 * @param options The options to use for rendering
 * @param root The class name of root element
 * @returns The React element that represents the rendered content
 */
export function renderToReactElement({
  content,
  extensions,
  options,
  rootClassName,
}: {
  content: Node | JSONContent;
  extensions: Extensions;
  options?: Partial<TiptapStaticRendererOptions<React.ReactNode, Mark, Node>>;
  rootClassName?: string;
}): React.ReactNode {
  return renderToElement<React.ReactNode>({
    renderer: renderJSONContentToReactElement,
    domOutputSpecToElement: domOutputSpecToReactElement,
    mapDefinedTypes: {
      // Map a doc node to concatenated children
      doc: ({ children }) =>
        createElement(
          "div",
          { className: rootClassName ?? "lb-editor" },
          children
        ),
      // Map a text node to its text content
      text: ({ node }) => node.text ?? "",
    },
    content,
    extensions,
    options,
  });
}
