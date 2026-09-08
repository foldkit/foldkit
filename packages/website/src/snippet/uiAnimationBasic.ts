// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Option, Schema } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Animation } from '@foldkit/ui'

// Add a field to your Model for the Animation Submodel. Animation tracks
// its own visibility and lifecycle state. No need for a separate flag:
const Model = Schema.Struct({
  animation: Animation.Model,
  // ...your other fields
})

// In your init function, initialize the Animation Submodel with a unique id:
const init = () => ({
  model: {
    animation: Animation.init({ id: 'content' }),
    // ...your other fields
  },
})

// Embed the Animation Message in your parent Message:
const Message = defineMessageUnion({
  GotAnimationMessage: { message: Animation.Message },
  ClickedToggleAnimation: {},
})
type Message = typeof Message.Type

// At module scope, fold the OutMessage into your own Model. It signals
// lifecycle events Animation can't handle on its own. Most importantly, it
// tells you when a leave animation has started so you can provide the Command
// that listens for animation settlement. That Command's result is an Animation
// Message, so use `liftCommand` from the fold context to lift it into the
// parent Message type. Each arm returns an Update.Step over the parent Model,
// which already has the next Animation Model written back:
const foldAnimationOutMessage = (
  outMessage: Animation.OutMessage,
  { liftCommand }: Update.FoldContext<Animation.Message, Message>,
) =>
  Animation.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
    // Animation handles enter completion internally but hands leave
    // settlement detection to you here, because the strategy varies
    // by consumer. For example, Foldkit's Dialog just waits for CSS,
    // while its Popover races CSS against the anchor button scrolling
    // off-screen. defaultLeaveCommand is the default strategy: it
    // waits for every CSS transition and keyframe animation on the
    // element to settle, then dispatches EndedAnimation back into
    // Animation.update. Use it unless you need a custom strategy.
    StartedLeaveAnimating: () => model => ({
      model,
      commands: [liftCommand(Animation.defaultLeaveCommand(model.animation))],
    }),
    // TransitionedOut is Animation's signal that the leave has fully
    // settled (your leave Command's EndedAnimation message has been
    // processed). Return Commands for any post-animation work, for
    // example: close a native dialog, remove an entry from a list,
    // release a resource. No Commands here because animateSize keeps the
    // element mounted (collapsed to zero height) so there's nothing to
    // tear down.
    TransitionedOut: () => model => ({ model }),
  })

// Update.foldChild wires the child into the parent: it runs Animation.update,
// writes the next Animation Model back, maps the Submodel's Commands into your
// Message type, and hands any OutMessage to foldOutMessage.
const foldAnimation = Update.foldChild({
  update: Animation.update,
  read: (model: Model) => Option.some(model.animation),
  write: (model, nextAnimation) =>
    evo(model, { animation: () => nextAnimation }),
  toParentMessage: message => Message.GotAnimationMessage({ message }),
  foldOutMessage: foldAnimationOutMessage,
})

// Programmatic child capabilities take the child Model and return its next
// Model and Commands. foldChildStep integrates that result without exposing
// the internal Showed or Hid Message constructors to the parent.
const foldAnimationShow = Update.foldChildStep({
  update: Animation.show,
  read: (model: Model) => Option.some(model.animation),
  write: (model, nextAnimation) =>
    evo(model, { animation: () => nextAnimation }),
  toParentMessage: message => Message.GotAnimationMessage({ message }),
})

const foldAnimationHide = Update.foldChildStep({
  update: Animation.hide,
  read: (model: Model) => Option.some(model.animation),
  write: (model, nextAnimation) =>
    evo(model, { animation: () => nextAnimation }),
  toParentMessage: message => Message.GotAnimationMessage({ message }),
})

// In the corresponding Message.match handlers, route child Messages through
// the regular fold and parent-owned actions through the child capabilities:
GotAnimationMessage: ({ message }) => foldAnimation(model, message)
ClickedToggleAnimation: () =>
  model.animation.isShowing
    ? foldAnimationHide(model)
    : foldAnimationShow(model)

// Inside your view function, dispatch a parent-owned fact. The parent update
// invokes the child capability. model.animation.isShowing is your source of
// truth for whether content is currently visible. The Animation view wraps
// your content. Data attributes drive the CSS transitions or keyframe
// animations defined in className:
const view = (h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      h.button(
        [h.OnClick(Message.ClickedToggleAnimation())],
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
        toParentMessage: message => Message.GotAnimationMessage({ message }),
      }),
    ],
  )
