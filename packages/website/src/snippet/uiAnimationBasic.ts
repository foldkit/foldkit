// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Animation } from '@foldkit/ui'

// Add a field to your Model for the Animation Submodel. Animation tracks
// its own visibility and lifecycle state. No need for a separate flag:
const Model = S.Struct({
  animation: Animation.Model,
  // ...your other fields
})

// In your init function, initialize the Animation Submodel with a unique id:
const init = () => [
  {
    animation: Animation.init({ id: 'content' }),
    // ...your other fields
  },
  [],
]

// Embed the Animation Message in your parent Message:
const GotAnimationMessage = m('GotAnimationMessage', {
  message: Animation.Message,
})

// At module scope, fold the OutMessage into your own Model. It signals
// lifecycle events Animation can't handle on its own. Most importantly, it
// tells you when a leave animation has started so you can provide the Command
// that listens for animation settlement. That Command's result is an Animation
// Message, so take the fold context's `liftCommand` and wrap it with the same
// lift the fold gives the Submodel's own Commands. Each arm returns an
// Update.Step over the parent Model, which already has the next Animation
// Model written back:
const foldAnimationOutMessage: (
  outMessage: Animation.OutMessage,
  context: Update.FoldContext<Animation.Message, Message>,
) => Update.Step<Model, Message> = (outMessage, { liftCommand }) =>
  M.value(outMessage).pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      // Animation handles enter completion internally but hands leave
      // settlement detection to you here, because the strategy varies
      // by consumer. For example, Foldkit's Dialog just waits for CSS,
      // while its Popover races CSS against the anchor button scrolling
      // off-screen. defaultLeaveCommand is the default strategy: it
      // waits for every CSS transition and keyframe animation on the
      // element to settle, then dispatches EndedAnimation back into
      // Animation.update. Use it unless you need a custom strategy.
      StartedLeaveAnimating: () => model => [
        model,
        [liftCommand(Animation.defaultLeaveCommand(model.animation))],
      ],
      // TransitionedOut is Animation's signal that the leave has fully
      // settled (your leave Command's EndedAnimation message has been
      // processed). Return Commands for any post-animation work, for
      // example: close a native dialog, remove an entry from a list,
      // release a resource. No Commands here because animateSize keeps the
      // element mounted (collapsed to zero height) so there's nothing to
      // tear down.
      TransitionedOut: () => model => [model, []],
    }),
  )

// Update.foldChild wires the child into the parent: it runs Animation.update,
// writes the next Animation Model back, maps the Submodel's Commands into your
// Message type, and hands any OutMessage to foldOutMessage.
const foldAnimation = Update.foldChild({
  update: Animation.update,
  read: (model: Model) => Option.some(model.animation),
  write: (model, nextAnimation) =>
    evo(model, { animation: () => nextAnimation }),
  toParentMessage: message => GotAnimationMessage({ message }),
  foldOutMessage: foldAnimationOutMessage,
})

// Inside your update function's M.tagsExhaustive({...}), call the fold:
GotAnimationMessage: ({ message }) => foldAnimation(model, message)

// Inside your view function, toggle visibility by dispatching Animation.Showed()
// or Hid() wrapped in your parent Message. model.animation.isShowing is your
// source of truth for whether content is currently visible. The Animation
// view wraps your content. Data attributes drive the CSS transitions or
// keyframe animations defined in className:
const view = (h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      h.button(
        [
          h.OnClick(
            GotAnimationMessage({
              message: model.animation.isShowing
                ? Animation.Hid()
                : Animation.Showed(),
            }),
          ),
        ],
        [model.animation.isShowing ? 'Hide' : 'Show'],
      ),
      h.submodel({
        slotId: 'content',
        model: model.animation,
        view: Animation.view,
        viewInputs: {
          animateSize: true,
          className:
            'transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
          content: h.p([], ['This content animates in and out.']),
        },
        toParentMessage: message => GotAnimationMessage({ message }),
      }),
    ],
  )
