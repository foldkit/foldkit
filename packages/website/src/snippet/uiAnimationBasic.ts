// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { OnClick, button, p } from './html'

// Add a field to your Model for the Animation Submodel. Animation tracks
// its own visibility and lifecycle state. No need for a separate flag:
const Model = S.Struct({
  animation: Ui.Animation.Model,
  // ...your other fields
})

// In your init function, initialize the Animation Submodel with a unique id:
const init = () => [
  {
    animation: Ui.Animation.init({ id: 'content' }),
    // ...your other fields
  },
  [],
]

// Embed the Animation Message in your parent Message:
const GotAnimationMessage = m('GotAnimationMessage', {
  message: Ui.Animation.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to
// Ui.Animation.update. It returns the next Animation Model, any Commands
// to forward, and an optional OutMessage. The OutMessage signals lifecycle
// events Animation can't handle on its own. Most importantly, it tells you
// when a leave animation has started so you can provide the Command that
// listens for animation settlement:
GotAnimationMessage: ({ message }) => {
  const [nextAnimation, commands, maybeOutMessage] = Ui.Animation.update(
    model.animation,
    message,
  )

  // Forward the Submodel's Commands through your parent Message:
  const mappedCommands = commands.map(
    Command.mapEffect(Effect.map(message => GotAnimationMessage({ message }))),
  )

  const lifecycleCommands = Option.match(maybeOutMessage, {
    onNone: () => [],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        M.tagsExhaustive({
          // Animation handles enter completion internally but hands leave
          // settlement detection to you here, because the strategy varies
          // by consumer. For example, Foldkit's Dialog just waits for CSS,
          // while its Popover races CSS against the anchor button scrolling
          // off-screen. defaultLeaveCommand is the default strategy: it
          // waits for every CSS transition and keyframe animation on the
          // element to settle, then dispatches EndedAnimation back into
          // Animation.update. Use it unless you need a custom strategy.
          StartedLeaveAnimating: () => [
            Command.mapEffect(
              Ui.Animation.defaultLeaveCommand(nextAnimation),
              Effect.map(message => GotAnimationMessage({ message })),
            ),
          ],
          // TransitionedOut is Animation's signal that the leave has fully
          // settled (your leave Command's EndedAnimation message has been
          // processed). Return Commands for any post-animation work: close
          // a native dialog, remove an entry from a list, release a resource,
          // etc. Empty here because animateSize keeps the element mounted
          // (collapsed to zero height) so there's nothing to tear down.
          TransitionedOut: () => [],
        }),
      ),
  })

  return [
    evo(model, { animation: () => nextAnimation }),
    [...mappedCommands, ...lifecycleCommands],
  ]
}

// Inside your view function, toggle visibility by dispatching Ui.Animation.Showed()
// or Hid() wrapped in your parent Message. model.animation.isShowing is your
// source of truth for whether content is currently visible:
button(
  [
    OnClick(
      GotAnimationMessage({
        message: model.animation.isShowing
          ? Ui.Animation.Hid()
          : Ui.Animation.Showed(),
      }),
    ),
  ],
  [model.animation.isShowing ? 'Hide' : 'Show'],
)

// The Animation view wraps your content. Data attributes drive the CSS
// transitions or keyframe animations defined in className:
Ui.Animation.view({
  model: model.animation,
  animateSize: true,
  className:
    'transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
  content: p([], ['This content animates in and out.']),
})
