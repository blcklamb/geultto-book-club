import { Extension } from "@tiptap/core";
import {
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction,
} from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export type SpellcheckDecorationIssue = {
  id: string;
  from: number;
  to: number;
  label: string;
};

type SpellcheckMeta =
  | { type: "set"; issues: SpellcheckDecorationIssue[] }
  | { type: "clear" }
  | { type: "remove"; id: string };

export const spellcheckPluginKey = new PluginKey<DecorationSet>(
  "spellcheckDecorations",
);

export function getSpellcheckDecorationRange(state: EditorState, id: string) {
  const decoration = spellcheckPluginKey
    .getState(state)
    ?.find()
    .find((candidate) => candidate.spec.id === id);
  return decoration ? { from: decoration.from, to: decoration.to } : null;
}

function toDecorations(issues: SpellcheckDecorationIssue[]) {
  return issues.map((issue) =>
    Decoration.inline(
      issue.from,
      issue.to,
      {
        class: "spellcheck-error",
        "data-spellcheck-id": issue.id,
        role: "button",
        tabIndex: "0",
        "aria-label": issue.label,
      },
      { id: issue.id },
    ),
  );
}

function overlapsChangedRange(
  from: number,
  to: number,
  transaction: Transaction,
) {
  let mappedFrom = from;
  let mappedTo = to;

  for (const stepMap of transaction.mapping.maps) {
    let overlaps = false;
    stepMap.forEach((oldStart, oldEnd) => {
      // An insertion inside an existing error also invalidates its suggestion.
      const isInsertion = oldStart === oldEnd;
      if (
        (isInsertion && oldStart > mappedFrom && oldStart < mappedTo) ||
        (!isInsertion && oldStart < mappedTo && oldEnd > mappedFrom)
      ) {
        overlaps = true;
      }
    });
    if (overlaps) return true;
    mappedFrom = stepMap.map(mappedFrom, -1);
    mappedTo = stepMap.map(mappedTo, 1);
  }

  return false;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spellcheckDecorations: {
      setSpellcheckIssues: (issues: SpellcheckDecorationIssue[]) => ReturnType;
      clearSpellcheckIssues: () => ReturnType;
      removeSpellcheckIssue: (id: string) => ReturnType;
    };
  }
}

export const SpellcheckDecorations = Extension.create({
  name: "spellcheckDecorations",

  addCommands() {
    return {
      setSpellcheckIssues:
        (issues) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(spellcheckPluginKey, { type: "set", issues } satisfies SpellcheckMeta));
          }
          return true;
        },
      clearSpellcheckIssues:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(spellcheckPluginKey, { type: "clear" } satisfies SpellcheckMeta));
          }
          return true;
        },
      removeSpellcheckIssue:
        (id) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(spellcheckPluginKey, { type: "remove", id } satisfies SpellcheckMeta));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: spellcheckPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, decorations) {
            const meta = transaction.getMeta(spellcheckPluginKey) as
              | SpellcheckMeta
              | undefined;
            if (meta?.type === "set") {
              return DecorationSet.create(transaction.doc, toDecorations(meta.issues));
            }
            if (meta?.type === "clear") return DecorationSet.empty;
            if (meta?.type === "remove") {
              return decorations.remove(
                decorations.find().filter((decoration) => decoration.spec.id === meta.id),
              );
            }

            if (!transaction.docChanged) return decorations;

            const affected = decorations
              .find()
              .filter((decoration) =>
                overlapsChangedRange(decoration.from, decoration.to, transaction),
              );
            return decorations
              .remove(affected)
              .map(transaction.mapping, transaction.doc);
          },
        },
        props: {
          decorations(state) {
            return spellcheckPluginKey.getState(state);
          },
        },
      }),
    ];
  },
});
