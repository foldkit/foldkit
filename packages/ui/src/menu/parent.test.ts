import { Effect, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import {
  DetectMenuMovementOrAnimationEnd,
  FocusMenuButton,
  FocusMenuItems,
  makeBlock,
} from './menu.js'

const RefinedMenu = makeBlock<'Edit' | 'Delete'>()

const ParentMessage = defineMessageUnion({
  ClickedOpenMenu: {},
})

const ParentOutMessage = defineMessageUnion({
  SelectedMenuItem: { value: Schema.Literals(['Edit', 'Delete']) },
})

class MenuParent extends Block<MenuParent>()('MenuParent', {
  Model: Schema.Struct({ menu: RefinedMenu }),
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
}) {}

const MenuParentLive = MenuParent.make(
  Effect.fn(function* () {
    const menu = yield* new RefinedMenu('menu', {
      id: 'parent-menu',
      isAnimated: true,
    })

    return {
      model: { menu },
      update: {
        ClickedOpenMenu: model => ({
          model,
          messages: [model.menu.send(RefinedMenu.Message.RequestedOpen())],
        }),
        ...menu.on({
          Selected: (model, { value }) => ({
            model,
            outMessage: ParentOutMessage.SelectedMenuItem({ value }),
          }),
          Closed: model => ({ model }),
        }),
      },
    }
  }),
).pipe(Layer.provide(RefinedMenu.Live))

describe('Menu inside a parent', () => {
  it.effect('opens, animates, selects, and finishes leaving', () =>
    Story.story(
      MenuParentLive,
      Story.message(ParentMessage.ClickedOpenMenu()),
      Story.model(model => {
        expect(model.menu.isOpen).toBe(true)
        expect(model.menu.animation.transitionState).toBe('EnterStart')
      }),
      Story.Command.expectExact(FocusMenuItems, Animation.WaitForPaint),
      Story.Command.resolve(
        FocusMenuItems,
        RefinedMenu.Message.CompletedFocusMenuItems(),
      ),
      Story.Command.resolve(
        Animation.WaitForPaint,
        Animation.Message.CompletedWaitForPaint({ generation: 1 }),
      ),
      Story.model(model => {
        expect(model.menu.animation.transitionState).toBe('EnterAnimating')
      }),
      Story.Command.expectExact(Animation.WaitForAnimationSettled),
      Story.Command.resolve(
        Animation.WaitForAnimationSettled,
        Animation.Message.EndedAnimation({ generation: 1 }),
      ),
      Story.model(model => {
        expect(model.menu.animation.transitionState).toBe('Idle')
      }),
      Story.Command.expectNone(),
      Story.message(
        Block.deliver(
          RefinedMenu,
          'menu',
          RefinedMenu.Message.SelectedItem({ item: 'Edit', index: 0 }),
        ),
      ),
      Story.expectOutMessage(
        ParentOutMessage.SelectedMenuItem({ value: 'Edit' }),
      ),
      Story.model(model => {
        expect(model.menu.isOpen).toBe(false)
        expect(model.menu.animation.transitionState).toBe('LeaveStart')
      }),
      Story.Command.expectExact(FocusMenuButton, Animation.WaitForPaint),
      Story.Command.resolve(
        FocusMenuButton,
        RefinedMenu.Message.CompletedFocusMenuButton(),
      ),
      Story.Command.resolve(
        Animation.WaitForPaint,
        Animation.Message.CompletedWaitForPaint({ generation: 2 }),
      ),
      Story.model(model => {
        expect(model.menu.animation.transitionState).toBe('LeaveAnimating')
      }),
      Story.Command.expectExact(
        DetectMenuMovementOrAnimationEnd({ id: 'parent-menu', generation: 2 }),
      ),
      Story.Command.resolve(
        DetectMenuMovementOrAnimationEnd,
        RefinedMenu.Message.CompletedDetectMenuMovementOrAnimationEnd({
          generation: 2,
        }),
      ),
      Story.model(model => {
        expect(model.menu.animation.transitionState).toBe('Idle')
      }),
      Story.Command.expectNone(),
    ),
  )
})
