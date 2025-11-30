import { createElement } from "react";

import { type MarkType, type NodeType } from "../../types";
import { type TiptapStaticRendererOptions } from "../renderer";
import { TiptapStaticRenderer } from "../renderer";

export function renderJSONContentToReactElement<
  /**
   * A mark type is either a JSON representation of a mark or a Prosemirror mark instance
   */
  TMarkType extends { type: any } = MarkType,
  /**
   * A node type is either a JSON representation of a node or a Prosemirror node instance
   */
  TNodeType extends {
    content?: { forEach: (cb: (node: TNodeType) => void) => void };
    marks?: readonly TMarkType[];
    type: string | { name: string };
  } = NodeType
>(options: TiptapStaticRendererOptions<React.ReactNode, TMarkType, TNodeType>) {
  let key = 0;

  return TiptapStaticRenderer<React.ReactNode, TMarkType, TNodeType>(
    ({
      component: Component,
      props: { children, node, options, ...props },
    }) => {
      const nodeType =
        typeof node.type === "string" ? node.type : node.type.name;

      if (
        nodeType === "fileBlock" ||
        nodeType === "imageBlock" ||
        nodeType === "linkBlock"
      ) {
        return createElement(
          Component as React.FC<typeof props>,
          // @ts-ignore
          Object.assign(
            {
              // @ts-ignore
              attrs: { ...node.attrs },
              options: { ...options },
            },
            { key: key++ }
          ),
          ([] as React.ReactNode[]).concat(children)
        );
      }

      return createElement(
        Component as React.FC<typeof props>,
        // eslint-disable-next-line no-plusplus
        Object.assign({ node, ...props }, { key: key++ }),
        ([] as React.ReactNode[]).concat(children)
      );
    },
    options
  );
}
