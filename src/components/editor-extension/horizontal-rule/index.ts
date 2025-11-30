import {
  HorizontalRule as TiptapHorizontalRule,
  type HorizontalRuleOptions,
} from "@tiptap/extension-horizontal-rule";

export { type HorizontalRuleOptions };

export const HorizontalRule = TiptapHorizontalRule.extend({
  addOptions() {
    return {
      HTMLAttributes: {
        class: "tiptap-horizontal-rule",
      },
    };
  },
});
