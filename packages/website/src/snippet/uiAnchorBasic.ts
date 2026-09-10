// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, Message, update,
// and view definitions.
import { Effect, Schema } from 'effect'
import { Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { AnchorConfig, anchorSetup } from '@foldkit/ui/anchor'

// Every Mount Definition declares at least one result Message. Name it after
// the Definition, the way a Command's result Message is named after the
// Command:
const Message = defineMessageUnion({
  CompletedAnchorPanel: {},
})

// Mount.define takes the Definition name and a config: a Schema for the args
// captured at mount, the result Messages, and execute. execute receives the
// live element alongside those args. anchorSetup is a plain DOM function that
// returns a cleanup, so it goes inside Effect.sync and the cleanup is
// registered with Effect.acquireRelease. Construct the resource inside the
// acquire body, never before it, or it leaks on interruption:
const AnchorPanel = Mount.define('AnchorPanel', {
  args: { buttonId: Schema.String, anchor: AnchorConfig },
  messages: [Message.CompletedAnchorPanel],
  execute: ({ element, buttonId, anchor }) =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => anchorSetup(element, { buttonId, anchor })),
        cleanup => Effect.sync(cleanup),
      )
      return Message.CompletedAnchorPanel()
    }),
})

// The trigger needs a stable id, because that is what anchorSetup resolves
// the button by. Render the panel only while it is open, and spread the Mount
// onto it. The panel starts at visibility: hidden so it cannot flash at the
// top left corner before Floating UI resolves its first position; anchorSetup
// clears that once the panel is placed:
const view = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.button(
        [h.Id('search-select-button'), h.OnClick(ClickedTrigger())],
        ['Open'],
      ),
      ...(model.isOpen
        ? [
            h.div(
              [
                h.Style({
                  position: 'absolute',
                  margin: '0',
                  visibility: 'hidden',
                }),
                h.Class('z-10 rounded-lg border bg-white shadow-lg'),
                h.OnMount(
                  AnchorPanel({
                    buttonId: 'search-select-button',
                    anchor: { placement: 'bottom-start', gap: 4 },
                  }),
                ),
              ],
              [
                // ...your own panel content
              ],
            ),
          ]
        : []),
    ],
  )

// Mount args are captured at mount, not refreshed across renders. When the
// config has to change, unmount and remount the panel rather than expecting
// a new `anchor` value to reach the running Mount.
