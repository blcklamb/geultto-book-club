import { Image as BaseImage } from "@tiptap/extension-image";
export { type ImageOptions } from "@tiptap/extension-image";

export const Image = BaseImage.extend({
  group: "block",

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      resize: false,
      ...this.parent?.(),
      HTMLAttributes: {
        class: "tiptap-image",
      },
    };
  },
});
