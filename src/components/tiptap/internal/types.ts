/**
 * A node type is either a JSON representation of a node or a Prosemirror node instance
 */

export type NodeType<
  Type extends
    | string
    | {
        name: string
      } = any,
  TAttributes extends undefined | Record<string, any> = any,
  NodeMarkType extends MarkType = any,
  TContent extends (NodeType | TextType)[] = any,
  TOptions extends undefined | Record<string, any> = any,
> = {
  type: Type
  attrs: TAttributes
  content?: TContent
  marks?: NodeMarkType[]
  options?: TOptions
}

/**
 * A mark type is either a JSON representation of a mark or a Prosemirror mark instance
 */
export type MarkType<
  Type extends
    | string
    | {
        name: string
      } = any,
  TAttributes extends undefined | Record<string, any> = any,
> = {
  type: Type
  attrs: TAttributes
}

/**
 * A node type is either a JSON representation of a text node or a Prosemirror text node instance
 */
type TextType<TMarkType extends MarkType = MarkType> = {
  type: 'text'
  text: string
  marks: TMarkType[]
}

type Attributes = Record<string, any>

export type DOMOutputSpecArray =
  | [string]
  | [string, Attributes]
  | [string, 0]
  | [string, Attributes, 0]
  | [string, Attributes, DOMOutputSpecArray | 0]
  | [string, DOMOutputSpecArray]
