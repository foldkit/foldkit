// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Option, Schema } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { HoverIntent } from '@foldkit/ui'

// Add a field to your Model:
const Model = Schema.Struct({
  hoverIntent: HoverIntent.Model,
  // ...your other fields
})
type Model = typeof Model.Type

// Initialize it. This behavior primitive owns no DOM id:
const init = () => ({
  model: {
    hoverIntent: HoverIntent.init({ openDelay: 200, closeDelay: 300 }),
    // ...your other fields
  },
})

// Embed child Messages in your parent Message:
const Message = defineMessageUnion({
  GotHoverIntentMessage: { message: HoverIntent.Message },
})
type Message = typeof Message.Type

const foldHoverIntentOutMessage = HoverIntent.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldHoverIntent = Update.foldChild({
  update: HoverIntent.update,
  read: model => Option.some(model.hoverIntent),
  write: (model, nextHoverIntent) =>
    evo(model, { hoverIntent: () => nextHoverIntent }),
  toParentMessage: message => Message.GotHoverIntentMessage({ message }),
  foldOutMessage: foldHoverIntentOutMessage,
})

GotHoverIntentMessage: ({ message }) => foldHoverIntent(model, message)

// Spread each attribute bundle onto the element it names. HoverIntent owns the
// interaction; this view owns the markup, semantics, positioning, and styles.
const triggerId = 'more-information-trigger'
const panelId = 'more-information-panel'

const view = (h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'more-information',
    model: model.hoverIntent,
    view: HoverIntent.view,
    viewInputs: {
      focusTriggerSelector: `#${triggerId}`,
      toView: ({ trigger, panel, isVisible }) =>
        h.div(
          [],
          [
            h.button(
              [
                ...trigger,
                h.Type('button'),
                h.Id(triggerId),
                h.AriaControls(panelId),
                h.AriaExpanded(isVisible),
              ],
              ['More information'],
            ),
            ...(isVisible
              ? [
                  h.div(
                    [...panel, h.Id(panelId)],
                    [
                      h.p(
                        [],
                        ['A short description can provide useful context.'],
                      ),
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: message => Message.GotHoverIntentMessage({ message }),
  })
