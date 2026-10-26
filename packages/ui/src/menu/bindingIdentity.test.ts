import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { expect, it } from 'vitest'

import * as Animation from '../animation/block.js'
import * as Menu from './menu.js'

const RefinedMenu = Menu.create<'Edit' | 'Delete'>()

const Model = Schema.Struct({ menu: RefinedMenu.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  RequestedOpen: {},
})

const OutMessage = defineMessageUnion({
  SelectedMenuItem: { value: Schema.Literals(['Edit', 'Delete']) },
})

const GenericMenuBindingIdentityDefinition = Block.makeDefinition(
  'GenericMenuBindingIdentity',
  {
    Model,
    Message,
    OutMessage,
  },
)

const MenuBinding = GenericMenuBindingIdentityDefinition.makeBinding(
  RefinedMenu,
  {
    field: 'menu',
    init: false,
  },
).withOutMessagePolicy({
  fold: GenericMenuBindingIdentityDefinition.makeOutMessageFold(RefinedMenu, {
    Selected: ({ value }) =>
      GenericMenuBindingIdentityDefinition.makeStep(model => ({
        model,
        outMessage: OutMessage.SelectedMenuItem({ value }),
      })),
    Closed: () => GenericMenuBindingIdentityDefinition.makeNoopStep(),
  }),
})

const GenericMenuBindingIdentityComposition =
  GenericMenuBindingIdentityDefinition.makeComposition({
    bindings: [MenuBinding],
  })

const init = GenericMenuBindingIdentityComposition.makeInit(() =>
  MenuBinding.init({
    args: [{ id: 'binding-identity', isAnimated: true }],
    toParentModel: menu => Model.make({ menu }),
  }),
)
const update = GenericMenuBindingIdentityComposition.makeUpdate({
  RequestedOpen: MenuBinding.requestOpen(),
})
const requestOpen = Message.RequestedOpen
const prepare = () =>
  GenericMenuBindingIdentityComposition.prepareBlock({
    init,
    update,
    operations: { requestOpen },
    EffectsLayer: RefinedMenu.EffectsLayer,
  })
const block: Block.FromAssemblyWithOutMessage<typeof Model, typeof prepare> =
  Block.assemble(prepare)

const deliverMenuMessage = (
  model: Model,
  message: typeof RefinedMenu.Message.Type,
) =>
  block.update(
    model,
    Schema.decodeSync(block.Message)({
      _tag: 'GotMenuMessage',
      placement: 'menu',
      generation: 0,
      message,
    }),
  )

const deliverAnimationMessage = (model: Model, message: Animation.Message) =>
  deliverMenuMessage(
    model,
    Schema.decodeSync(RefinedMenu.Message)({
      _tag: 'GotAnimationMessage',
      placement: 'animation',
      generation: 0,
      message,
    }),
  )

it('uses the factory Menu Animation Binding through open and completion', () => {
  const menuInit = block.init()
  const model = menuInit.model

  const menuOpen = block.operations.requestOpen(model)

  expect(menuOpen.model.menu.isOpen).toBe(true)
  expect(menuOpen.model.menu.animation.transitionState).toBe('EnterStart')
  expect(menuOpen.commands?.map(command => command.name)).toEqual([
    'menu/FocusMenuItems',
    'menu/animation/WaitForPaint',
  ])

  const startedEnter = deliverAnimationMessage(
    menuOpen.model,
    Animation.Message.CompletedWaitForPaint({ generation: 1 }),
  )

  expect(startedEnter.model.menu.animation.transitionState).toBe(
    'EnterAnimating',
  )
  expect(startedEnter.commands?.map(command => command.name)).toEqual([
    'menu/animation/WaitForAnimationSettled',
  ])

  const completedEnter = deliverAnimationMessage(
    startedEnter.model,
    Animation.Message.EndedAnimation({ generation: 1 }),
  )

  expect(completedEnter.model.menu.animation.transitionState).toBe('Idle')
  expect(completedEnter.commands).toEqual([])

  const selected = deliverMenuMessage(
    completedEnter.model,
    RefinedMenu.Message.SelectedItem({ item: 'Edit', index: 0 }),
  )

  expect(selected.model.menu.isOpen).toBe(false)
  expect(selected.model.menu.animation.transitionState).toBe('LeaveStart')
  expect(selected.commands?.map(command => command.name)).toEqual([
    'menu/FocusMenuButton',
    'menu/animation/WaitForPaint',
  ])
  expect(selected.outMessage).toEqual(
    OutMessage.SelectedMenuItem({ value: 'Edit' }),
  )

  const startedLeave = deliverAnimationMessage(
    selected.model,
    Animation.Message.CompletedWaitForPaint({ generation: 2 }),
  )

  expect(startedLeave.model.menu.animation.transitionState).toBe(
    'LeaveAnimating',
  )
  expect(startedLeave.commands?.map(command => command.name)).toEqual([
    'menu/DetectMenuMovementOrAnimationEnd',
  ])

  const completedLeave = deliverMenuMessage(
    startedLeave.model,
    RefinedMenu.Message.CompletedDetectMenuMovementOrAnimationEnd({
      generation: 2,
    }),
  )

  expect(completedLeave.model.menu.animation.transitionState).toBe('Idle')
  expect(completedLeave.commands).toEqual([])
})
