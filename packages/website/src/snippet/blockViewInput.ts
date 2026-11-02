import { Array, Schema } from 'effect'
import { Block } from 'foldkit'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export type DisclosureAttributes = Readonly<{
  button: ReadonlyArray<ChildAttribute>
  panel: ReadonlyArray<ChildAttribute>
}>

export type DisclosureViewInput = Readonly<{
  toView: (attributes: DisclosureAttributes, isOpen: boolean) => Html
}>

export class Disclosure extends Block<Disclosure, void, DisclosureViewInput>()(
  'Disclosure',
  {
    Model: Schema.Struct({ panelId: Schema.String, isOpen: Schema.Boolean }),
    Message: defineMessageUnion({ ClickedToggle: {} }),
  },
) {}

export const DisclosureLive = Disclosure.toLayer(() => ({
  init: (_args, { path }) => ({
    panelId: `${Array.join(path, '-')}-panel`,
    isOpen: false,
  }),

  update: {
    ClickedToggle: model => ({
      model: modifyFields(model, { isOpen: isOpen => !isOpen }),
    }),
  },

  view: (model, h, { toView }) =>
    toView(
      {
        button: childAttributes([
          h.AriaExpanded(model.isOpen),
          h.AriaControls(model.panelId),
          h.OnClick(Disclosure.Message.ClickedToggle()),
        ]),
        panel: childAttributes([h.Id(model.panelId)]),
      },
      model.isOpen,
    ),
}))
