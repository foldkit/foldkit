// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Animation } from '@foldkit/ui'

// Add a field to your Model for the Animation Block. Animation tracks
// its own visibility and lifecycle state. No need for a separate flag:
const Model = Schema.Struct({
  animation: Animation.AnimationBlock.Model,
  // ...your other fields
})

// Declare only parent-owned facts. The Composition derives Animation delivery.
const Message = defineMessageUnion({
  ClickedToggleAnimation: {},
})

const AnimationExampleDefinition = Block.makeDefinition('AnimationExample', {
  Model,
  Message,
})

// Bind before defining the policy so its standard leave operation is available
// inside the StartedLeaveAnimating branch.
const AnimationBinding = AnimationExampleDefinition.makeBinding(
  Animation.AnimationBlock,
  {
    field: 'animation',
    init: { contextToArgs: () => Tuple.make({ id: 'content' }) },
  },
)

const foldAnimationOutMessage = AnimationExampleDefinition.makeOutMessageFold(
  Animation.AnimationBlock,
  {
    // The operation asks Animation to wait for its wrapper's CSS to settle.
    // A custom policy can race another signal against that settlement instead.
    StartedLeaveAnimating: () =>
      AnimationBinding.requestWaitForLeaveSettlement(),
    // TransitionedOut is Animation's signal that the leave has fully
    // settled (your leave Command's EndedAnimation message has been
    // processed). Return Commands for any post-animation work, for
    // example: close a native dialog, remove an entry from a list,
    // release a resource. No Commands here because animateSize keeps the
    // element mounted (collapsed to zero height) so there's nothing to
    // tear down.
    TransitionedOut: AnimationExampleDefinition.makeNoopStep,
  },
)

const AnimationExampleComposition = AnimationExampleDefinition.makeComposition({
  bindings: [
    AnimationBinding.withOutMessagePolicy({ fold: foldAnimationOutMessage }),
  ],
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

const update = AnimationExampleComposition.makeUpdate({
  ClickedToggleAnimation: model =>
    model.animation.isShowing
      ? AnimationBinding.requestHide()(model)
      : AnimationBinding.requestShow()(model),
})

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
            toView: () => h.p([], ['This content animates in and out.']),
          },
        }),
      ),
    ],
  ),
)
