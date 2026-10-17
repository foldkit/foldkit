// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema, Tuple } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Animation } from '@foldkit/ui'
import type {
  Message as AnimationMessage,
  OutMessage as AnimationOutMessage,
} from '@foldkit/ui/animation'
import { defaultLeaveCommand as AnimationDefaultLeaveCommand } from '@foldkit/ui/animation'

// Add a field to your Model for the Animation Block. Animation tracks
// its own visibility and lifecycle state. No need for a separate flag:
const Model = Schema.Struct({
  animation: Animation.Model,
  // ...your other fields
})
type Model = typeof Model.Type

// Embed the Animation Message in your parent Message:
const Message = defineMessageUnion({
  GotAnimationMessage: { message: Animation.Message },
  ClickedToggleAnimation: {},
})
type Message = typeof Message.Type

const AnimationExample = Block.define('AnimationExample', {
  Model,
  Message,
})

// At module scope, fold the OutMessage into your own Model. It signals
// lifecycle events Animation can't handle on its own. Most importantly, it
// tells you when a leave animation has started so you can provide the Command
// that listens for animation settlement. That Command's result is an Animation
// Message, so use `liftCommand` from the fold context to lift it into the
// parent Message type. Each arm returns an Update.Step over the parent Model,
// which already has the next Animation Model written back:
const foldAnimationOutMessage = (
  outMessage: AnimationOutMessage,
  { liftCommand }: Update.FoldContext<AnimationMessage, Message, Model>,
) =>
  Animation.OutMessage.match(outMessage, {
    // Animation handles enter completion internally but hands leave
    // settlement detection to you here, because the strategy varies
    // by consumer. For example, Foldkit's Dialog just waits for CSS,
    // while its Popover races CSS against the anchor button scrolling
    // off-screen. defaultLeaveCommand is the default strategy: it
    // waits for every CSS transition and keyframe animation on the
    // element to settle, then dispatches EndedAnimation back into
    // Animation.update. Use it unless you need a custom strategy.
    StartedLeaveAnimating: () =>
      AnimationExample.step(model => ({
        model,
        commands: [liftCommand(AnimationDefaultLeaveCommand(model.animation))],
      })),
    // TransitionedOut is Animation's signal that the leave has fully
    // settled (your leave Command's EndedAnimation message has been
    // processed). Return Commands for any post-animation work, for
    // example: close a native dialog, remove an entry from a list,
    // release a resource. No Commands here because animateSize keeps the
    // element mounted (collapsed to zero height) so there's nothing to
    // tear down.
    TransitionedOut: () => AnimationExample.step(model => ({ model })),
  })

// The Binding wires the completed child Block into the parent: it runs Animation.update,
// writes the next Animation Model back, maps the Block's Commands into your
// Message type, and hands any OutMessage to the OutMessage fold.
const AnimationBinding = AnimationExample.bindChild(Animation.block, {
  field: 'animation',
  parentMessage: Message.GotAnimationMessage,
  init: { args: () => Tuple.make({ id: 'content' }) },
  outMessage: { fold: foldAnimationOutMessage },
})

const AnimationExampleComposition = AnimationExample.makeComposition({
  childBindings: [AnimationBinding],
})

// In your init function, specify the fields the parent owns. The Composition
// initializes the bound Animation Model.
const init = AnimationExampleComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

// Bound public operations integrate the next child Model and Commands without
// exposing the internal Showed or Hid Message constructors to the parent.

const update = AnimationExampleComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedToggleAnimation: () =>
      model.animation.isShowing
        ? AnimationBinding.hide()(model)
        : AnimationBinding.show()(model),
  }),
)

// Inside your view function, dispatch a parent-owned fact. The parent update
// invokes the child capability. model.animation.isShowing is your source of
// truth for whether content is currently visible. The Animation view wraps
// your content. Data attributes drive the CSS transitions or keyframe
// animations defined in className:
const view = AnimationExampleComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.button(
        [h.OnClick(Message.ClickedToggleAnimation())],
        [model.animation.isShowing ? 'Hide' : 'Show'],
      ),
      h.block(
        AnimationBinding.embedView({
          slotId: 'content',
          model: model.animation,
          viewInputs: {
            animateSize: true,
            className:
              'transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
            content: h.p([], ['This content animates in and out.']),
          },
        }),
      ),
    ],
  ),
)
