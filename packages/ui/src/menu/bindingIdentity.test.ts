import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import * as Menu from './menu.js'

const RefinedMenu = Menu.makeBlock<'Edit' | 'Delete'>()

const Model = Schema.Struct({ menu: RefinedMenu.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  RequestedOpen: {},
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  SelectedMenuItem: { value: Schema.Literals(['Edit', 'Delete']) },
})
type OutMessage = typeof OutMessage.Type

const GenericMenuBindingIdentityKey = Symbol('GenericMenuBindingIdentity')
const GenericMenuBindingIdentityBlock = Block.make(
  'GenericMenuBindingIdentity',
  {
    key: GenericMenuBindingIdentityKey,
    Model,
    Message,
    OutMessage,
    InitArgs: Schema.Tuple([]),
    ChildInitContext: Menu.InitConfig,
  },
)

const MenuBinding = GenericMenuBindingIdentityBlock.makeRequiredFieldBinding(
  RefinedMenu,
  {
    field: 'menu',
    init: { contextToArgs: config => [config] },
  },
).withOutMessagePolicy({
  fold: GenericMenuBindingIdentityBlock.makeOutMessageFold(RefinedMenu, {
    Selected: ({ value }) =>
      GenericMenuBindingIdentityBlock.makeStep(model => ({
        model,
        outMessage: OutMessage.SelectedMenuItem({ value }),
      })),
    Closed: () => GenericMenuBindingIdentityBlock.makeNoopStep(),
  }),
})

const GenericMenuBindingIdentityComposition =
  GenericMenuBindingIdentityBlock.makeComposition({
    bindings: [MenuBinding],
  })

const init = GenericMenuBindingIdentityComposition.makeInit(() => ({
  model: {},
  childInitContext: { id: 'binding-identity', isAnimated: true },
}))
const update = GenericMenuBindingIdentityComposition.makeUpdate({
  RequestedOpen: MenuBinding.requestOpen(),
})
const block = {
  block: GenericMenuBindingIdentityBlock,
  layer: GenericMenuBindingIdentityBlock.makeLayer(
    Effect.gen(function* () {
      const children =
        yield* GenericMenuBindingIdentityComposition.acquireChildren()

      return {
        children,
        init,
        update,
      }
    }),
  ).pipe(Layer.provide(Menu.layer)),
}

it.effect(
  'uses the factory Menu Animation Binding through open and completion',
  () =>
    Story.story(
      block,
      Story.init(),
      Story.message(Message.RequestedOpen()),
      Story.model(model => {
        expect(model.menu.isOpen).toBe(true)
        expect(model.menu.animation.transitionState).toBe('EnterStart')
      }),
      Story.Command.expectExact(Menu.FocusMenuItems, Animation.WaitForPaint),
      Story.Command.resolve(
        Menu.FocusMenuItems,
        Menu.Message.CompletedFocusMenuItems(),
      ),
      Story.Command.resolve(
        Animation.WaitForPaint,
        Animation.Message.CompletedWaitForPaint({ generation: 1 }),
      ),
      Story.model(model =>
        expect(model.menu.animation.transitionState).toBe('EnterAnimating'),
      ),
      Story.Command.expectExact(Animation.WaitForAnimationSettled),
      Story.Command.resolve(
        Animation.WaitForAnimationSettled,
        Animation.Message.EndedAnimation({ generation: 1 }),
      ),
      Story.model(model =>
        expect(model.menu.animation.transitionState).toBe('Idle'),
      ),
      Story.Command.expectNone(),
      Story.messageIn(
        MenuBinding,
        RefinedMenu.Message.SelectedItem({ item: 'Edit', index: 0 }),
      ),
      Story.model(model => {
        expect(model.menu.isOpen).toBe(false)
        expect(model.menu.animation.transitionState).toBe('LeaveStart')
      }),
      Story.expectOutMessage(OutMessage.SelectedMenuItem({ value: 'Edit' })),
      Story.Command.expectExact(Menu.FocusMenuButton, Animation.WaitForPaint),
      Story.Command.resolve(
        Menu.FocusMenuButton,
        Menu.Message.CompletedFocusMenuButton(),
      ),
      Story.Command.resolve(
        Animation.WaitForPaint,
        Animation.Message.CompletedWaitForPaint({ generation: 2 }),
      ),
      Story.model(model =>
        expect(model.menu.animation.transitionState).toBe('LeaveAnimating'),
      ),
      Story.Command.expectExact(Menu.DetectMenuMovementOrAnimationEnd),
      Story.Command.resolve(
        Menu.DetectMenuMovementOrAnimationEnd,
        Menu.Message.CompletedDetectMenuMovementOrAnimationEnd({
          generation: 2,
        }),
      ),
      Story.model(model =>
        expect(model.menu.animation.transitionState).toBe('Idle'),
      ),
      Story.Command.expectNone(),
    ),
)
