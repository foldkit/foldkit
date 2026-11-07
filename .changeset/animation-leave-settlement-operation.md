---
'@foldkit/ui': minor
---

Add the Message-backed `AnimationBinding.requestWaitForLeaveSettlement()` operation for the standard leave policy. It returns `WaitForAnimationSettled` only while the Animation is in `LeaveAnimating`, using the child Model's current `id` and transition generation.

Before (previous preview):

```ts
import { Animation } from '@foldkit/ui'
import { defaultLeaveCommand } from '@foldkit/ui/animation'

const foldAnimationOutMessage = ParentDefinition.makeOutMessageFold(
  Animation.AnimationBlock,
  {
    StartedLeaveAnimating: (_, { liftCommand }) =>
      ParentDefinition.step(model => ({
        model,
        commands: [liftCommand(defaultLeaveCommand(model.animation))],
      })),
    TransitionedOut: ParentDefinition.stepNoop,
  },
)

const AnimationBinding = ParentDefinition.bindChild(Animation.AnimationBlock, {
  field: 'animation',
  init: { contextToArgs: () => [{ id: 'content' }] },
}).withOutMessagePolicy({ fold: foldAnimationOutMessage })
```

After: create the Animation Binding before its OutMessage fold, then handle `StartedLeaveAnimating` by returning the bound operation:

```ts
import { Animation } from '@foldkit/ui'

const AnimationBinding = ParentDefinition.makeRequiredFieldBinding(
  Animation.AnimationBlock,
  {
    field: 'animation',
    init: { contextToArgs: () => [{ id: 'content' }] },
  },
)

const foldAnimationOutMessage = ParentDefinition.makeOutMessageFold(
  Animation.AnimationBlock,
  {
    StartedLeaveAnimating: () =>
      AnimationBinding.requestWaitForLeaveSettlement(),
    TransitionedOut: ParentDefinition.makeNoopStep,
  },
)

const ParentComposition = ParentDefinition.makeComposition({
  bindings: [
    AnimationBinding.withOutMessagePolicy({ fold: foldAnimationOutMessage }),
  ],
})
```

Remove `Animation.defaultLeaveCommand`. Existing consumers should delete the child Model read and `FoldContext.liftCommand` call used only for standard settlement. Custom leave Commands remain supported: take `generation` from `StartedLeaveAnimating`, return it in `EndedAnimation`, and keep application cleanup in the `TransitionedOut` policy.
