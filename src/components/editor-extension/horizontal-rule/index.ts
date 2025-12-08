import {
  HorizontalRule as TiptapHorizontalRule,
  type HorizontalRuleOptions,
} from "@tiptap/extension-horizontal-rule";

export { type HorizontalRuleOptions };

export const HorizontalRule = TiptapHorizontalRule.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: "tiptap-horizontal-rule",
      },
      nextNodeType: this.parent?.().nextNodeType || "paragraph",
    };
  },
});
