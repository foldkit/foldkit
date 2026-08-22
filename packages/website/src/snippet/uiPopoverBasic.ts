// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Popover } from '@foldkit/ui'

// Add a field to your Model for the Popover Submodel:
const Model = S.Struct({
  popover: Popover.Model,
  // ...your other fields
})

// In your init function, initialize the Popover Submodel with a unique id:
const init = () => ({
  model: {
    popover: Popover.init({ id: 'info' }),
    // ...your other fields
  },
})

// Embed the Popover Message in your parent Message:
const Message = defineMessageUnion({
  GotPopoverMessage: { message: Popover.Message },
})

// At module scope, fold the OutMessage into your own Model. `Opened` and
// `Closed` mark the visibility transitions. Fire analytics, coordinate with
// other UI, or clear ephemeral state on close. Each arm returns an
// Update.Step over the parent Model, which already has the next Popover Model
// written back:
const foldPopoverOutMessage = M.type<Popover.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    // The child has emitted `Opened`. In this arm the parent can update its
    // own state or dispatch its own Commands, for example lazy-load panel
    // content, log analytics, or trigger a downstream Command.
    Opened: () => model => ({ model }),
    // The child has emitted `Closed`. In this arm the parent can update its
    // own state or dispatch its own Commands, for example persist a draft,
    // clear ephemeral state, or trigger a downstream Command.
    Closed: () => model => ({ model }),
  }),
)

// Update.foldChild wires the child into the parent: it runs Popover.update,
// writes the next Popover Model back, maps the Submodel's Commands into your
// Message type, and hands any OutMessage to foldOutMessage.
const foldPopover = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.popover),
  write: (model, nextPopover) => evo(model, { popover: () => nextPopover }),
  toParentMessage: message => Message.GotPopoverMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

// Inside your update function's Message.match({...}), call the fold:
GotPopoverMessage: ({ message }) => foldPopover(model, message)

// Inside your view function, embed the popover via h.submodel. Give the
// trigger an accessible name: target the trigger id with
// `Popover.buttonId('info')` from a native `<label for>`, and pass
// `ariaLabelledBy` so the trigger is named by the label. The attribute is
// only emitted when provided, so the trigger never carries a dangling
// `aria-labelledby`.
const view = (h: HtmlBuilder<Message>) => {
  const labelId = 'info-label'

  return h.submodel({
    slotId: 'info',
    model: model.popover,
    view: Popover.view,
    viewInputs: {
      ariaLabelledBy: labelId,
      anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
      toView: ({ button, panel, backdrop, isVisible }) =>
        h.div(
          [h.Class('relative inline-block')],
          [
            h.label(
              [h.Id(labelId), h.For(Popover.buttonId('info'))],
              ['Solutions'],
            ),
            h.button(
              [
                ...button,
                h.Class('rounded-lg border px-3 py-2 cursor-pointer'),
              ],
              [h.span([], ['Solutions'])],
            ),
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class('fixed inset-0')]),
                  h.div(
                    [...panel, h.Class('rounded-lg border shadow-lg p-4 w-80')],
                    [
                      h.h3([h.Class('font-medium')], ['Analytics']),
                      h.p(
                        [h.Class('text-sm text-gray-500')],
                        [
                          'Get a better understanding of where your traffic is coming from.',
                        ],
                      ),
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: message => Message.GotPopoverMessage({ message }),
  })
}
