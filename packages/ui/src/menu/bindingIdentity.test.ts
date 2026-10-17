import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import type * as Update from 'foldkit/update'
import { expect, it } from 'vitest'

import * as Animation from '../animation/index.js'
import * as Menu from './index.js'

const RefinedMenu = Menu.create<'Edit' | 'Delete'>()

const Model = Schema.Struct({ menu: RefinedMenu.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  GotMenuMessage: { message: RefinedMenu.Message },
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  SelectedMenuItem: { value: Schema.Literals(['Edit', 'Delete']) },
})
type OutMessage = typeof OutMessage.Type

const GenericMenuBindingIdentity = Block.define('GenericMenuBindingIdentity', {
  Model,
  Message,
  OutMessage,
})

const MenuBinding = GenericMenuBindingIdentity.bindChild(RefinedMenu, {
  field: 'menu',
  parentMessage: Message.GotMenuMessage,
  init: false,
  outMessage: {
    fold: RefinedMenu.OutMessage.match<
      Update.StepWithOutMessage<Model, Message, OutMessage>
    >({
      Selected: ({ value }) =>
        GenericMenuBindingIdentity.step(model => ({
          model,
          outMessage: OutMessage.SelectedMenuItem({ value }),
        })),
    }),
  },
})

const GenericMenuBindingIdentityComposition =
  GenericMenuBindingIdentity.makeComposition({
    childBindings: [MenuBinding],
  })

const init = GenericMenuBindingIdentityComposition.makeInit(() =>
  MenuBinding.init({
    args: [{ id: 'binding-identity', isAnimated: true }],
    toParentModel: menu => Model.make({ menu }),
  }),
)
const update = GenericMenuBindingIdentityComposition.makeUpdate()
const open = GenericMenuBindingIdentity.step(() => MenuBinding.open())
const block = GenericMenuBindingIdentityComposition.makeBlock({
  init,
  update,
  expose: { open },
  EffectsLayer: RefinedMenu.EffectsLayer,
})

const deliverAnimationMessage = (model: Model, message: Animation.Message) =>
  update(
    model,
    Message.GotMenuMessage({
      message: RefinedMenu.Message.GotAnimationMessage({ message }),
    }),
  )

it('uses the factory Menu Animation Binding through open and completion', () => {
  const menuInit = block.init()
  const model = menuInit.model

  const menuOpen = block.expose.open(model)

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

  const selected = block.update(
    completedEnter.model,
    Message.GotMenuMessage({
      message: RefinedMenu.Message.SelectedItem({ item: 'Edit', index: 0 }),
    }),
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

  const completedLeave = update(
    startedLeave.model,
    Message.GotMenuMessage({
      message: RefinedMenu.Message.CompletedDetectMenuMovementOrAnimationEnd({
        generation: 2,
      }),
    }),
  )

  expect(completedLeave.model.menu.animation.transitionState).toBe('Idle')
  expect(completedLeave.commands).toEqual([])
})
