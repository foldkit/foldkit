// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { OnClick, button, p } from './html'

// Add a field to your Model for the Transition Submodel. Transition tracks
// its own visibility and animation state — no need for a separate flag:
const Model = S.Struct({
  transition: Ui.Transition.Model,
  // ...your other fields
})

// In your init function, initialize the Transition Submodel with a unique id:
const init = () => [
  {
    transition: Ui.Transition.init({ id: 'content' }),
    // ...your other fields
  },
  [],
]

// Embed the Transition Message in your parent Message:
const GotTransitionMessage = m('GotTransitionMessage', {
  message: Ui.Transition.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to
// Ui.Transition.update. It returns a three-tuple: [model, commands, maybeOutMessage].
// The OutMessage signals lifecycle events Transition can't handle on its own —
// most importantly, it tells you when a leave animation has started so you
// can provide the Command that listens for transitionend:
GotTransitionMessage: ({ message }) => {
  const [nextTransition, commands, maybeOutMessage] = Ui.Transition.update(
    model.transition,
    message,
  )

  // Forward the Submodel's Commands through your parent Message:
  const mappedCommands = commands.map(
    Command.mapEffect(Effect.map(message => GotTransitionMessage({ message }))),
  )

  // On StartedLeaveAnimating, hook up defaultLeaveCommand — it listens for
  // the CSS transitionend event and dispatches EndedTransition back into
  // Transition.update. TransitionedOut fires when the leave finishes — use
  // it to unmount content if needed (unused here since animateSize keeps
  // the element in the DOM):
  const lifecycleCommands = Option.match(maybeOutMessage, {
    onNone: () => [],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        M.tagsExhaustive({
          StartedLeaveAnimating: () => [
            Command.mapEffect(
              Ui.Transition.defaultLeaveCommand(nextTransition),
              Effect.map(message => GotTransitionMessage({ message })),
            ),
          ],
          TransitionedOut: () => [],
        }),
      ),
  })

  return [
    evo(model, { transition: () => nextTransition }),
    [...mappedCommands, ...lifecycleCommands],
  ]
}

// Inside your view function, toggle visibility by dispatching Ui.Transition.Showed()
// or Hid() wrapped in your parent Message. model.transition.isShowing is your
// source of truth for whether content is currently visible:
button(
  [
    OnClick(
      GotTransitionMessage({
        message: model.transition.isShowing
          ? Ui.Transition.Hid()
          : Ui.Transition.Showed(),
      }),
    ),
  ],
  [model.transition.isShowing ? 'Hide' : 'Show'],
)

// The Transition view wraps your content — data attributes drive the CSS
// transitions defined in className:
Ui.Transition.view({
  model: model.transition,
  animateSize: true,
  className:
    'transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
  content: p([], ['This content animates in and out.']),
})
