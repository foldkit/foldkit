import { Effect, Number, Option, Schema } from 'effect'
import { Scene, Story, Update } from 'foldkit'
import * as Command from 'foldkit/command'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from './public.js'

const Model = Schema.Struct({
  animation: Animation.Model,
  cleanupCount: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedToggle: {},
  ClickedPrepare: {},
  CompletedPrepare: {},
  CompletedCleanup: {},
  GotAnimationMessage: { message: Animation.Message },
})
type Message = typeof Message.Type

const Prepare = Command.define('Prepare', {
  messages: [Message.CompletedPrepare],
  execute: Effect.succeed(Message.CompletedPrepare()),
})

const Cleanup = Command.define('Cleanup', {
  messages: [Message.CompletedCleanup],
  execute: Effect.succeed(Message.CompletedCleanup()),
})

const foldAnimationOutMessage = (
  outMessage: Animation.OutMessage,
  { liftCommand }: Update.FoldContext<Animation.Message, Message>,
) =>
  Animation.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
    StartedLeaveAnimating: () => model => ({
      model,
      commands: [liftCommand(Animation.defaultLeaveCommand(model.animation))],
    }),
    TransitionedOut: () => model => ({ model, commands: [Cleanup()] }),
  })

const foldConfig = {
  read: (model: Model) => Option.some(model.animation),
  write: (model: Model, nextAnimation: Animation.Model) =>
    modifyFields(model, { animation: () => nextAnimation }),
  toParentMessage: (message: Animation.Message) =>
    Message.GotAnimationMessage({ message }),
}

const foldAnimation = Update.foldChild({
  ...foldConfig,
  update: Animation.update,
  foldOutMessage: foldAnimationOutMessage,
})

const foldAnimationToggle = Update.foldChildStep({
  ...foldConfig,
  update: Animation.toggle,
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedToggle: () => foldAnimationToggle(model),
    ClickedPrepare: () => ({ model, commands: [Prepare()] }),
    CompletedPrepare: () => foldAnimationToggle(model),
    CompletedCleanup: () => ({
      model: modifyFields(model, { cleanupCount: Number.increment }),
    }),
    GotAnimationMessage: ({ message }) => foldAnimation(model, message),
  })

const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedToggle())], ['Toggle']),
      h.button([h.OnClick(Message.ClickedPrepare())], ['Prepare']),
      h.p([h.Id('cleanup-count')], [globalThis.String(model.cleanupCount)]),
      h.submodel({
        slotId: 'animation',
        model: model.animation,
        view: Animation.view,
        viewInputs: { content: h.span([], ['Content']) },
        toParentMessage: message => Message.GotAnimationMessage({ message }),
      }),
    ],
  )

const initialModel: Model = {
  animation: Animation.init({ id: 'panel', isShowing: true }),
  cleanupCount: 0,
}

const carriedCases: ReadonlyArray<
  Readonly<{
    name: string
    step: Animation.test.GenerationStep
    command:
      | ReturnType<typeof Animation.WaitForPaint>
      | ReturnType<typeof Animation.WaitForAnimationSettled>
    resolver: Story.Resolver
  }>
> = [
  {
    name: 'paint',
    step: Animation.test.paint,
    command: Animation.WaitForPaint({ generation: 1 }),
    resolver: [
      Animation.WaitForPaint,
      Animation.Message.CompletedWaitForPaint({ generation: 1 }),
    ],
  },
  {
    name: 'settled',
    step: Animation.test.settled,
    command: Animation.WaitForAnimationSettled({ id: 'panel', generation: 1 }),
    resolver: [
      Animation.WaitForAnimationSettled,
      Animation.Message.EndedAnimation({ generation: 1 }),
    ],
  },
]

describe.each(carriedCases)(
  'Animation.test.$name with a carried resolver',
  testCase => {
    const update = (model: Model, message: Animation.Message) =>
      Animation.Message.match<Update.Return<Model, Animation.Message>>(
        message,
        {
          Showed: () => ({ model, commands: [testCase.command] }),
          Hid: () => ({ model }),
          CompletedWaitForPaint: () => ({
            model: modifyFields(model, { cleanupCount: Number.increment }),
          }),
          EndedAnimation: () => ({
            model: modifyFields(model, { cleanupCount: Number.increment }),
          }),
        },
      )

    const view = (model: Model, h: HtmlBuilder<Animation.Message>) =>
      h.div(
        [],
        [
          h.button([h.OnClick(Animation.Message.Showed())], ['Start']),
          h.p([h.Id('count')], [globalThis.String(model.cleanupCount)]),
        ],
      )

    it('does not carry a generation resolver into another Story dispatch', () => {
      Story.story(
        update,
        Story.given(initialModel),
        Story.Command.resolveAll(testCase.resolver),
        Story.message(Animation.Message.Showed()),
        testCase.step,
        Story.model((model: Model) => expect(model.cleanupCount).toBe(1)),
        Story.message(Animation.Message.Showed()),
        Story.Command.resolveAll(),
        Story.Command.expectHas(testCase.command),
        testCase.step,
        Story.model((model: Model) => expect(model.cleanupCount).toBe(2)),
      )
    })

    it('does not carry a generation resolver into another Scene dispatch', () => {
      Scene.scene(
        { update, view },
        Scene.given(initialModel),
        Scene.Command.resolveAll(testCase.resolver),
        Scene.click(Scene.role('button', { name: 'Start' })),
        testCase.step,
        Scene.expect(Scene.selector('#count')).toHaveText('1'),
        Scene.click(Scene.role('button', { name: 'Start' })),
        Scene.Command.resolveAll(),
        Scene.Command.expectHas(testCase.command),
        testCase.step,
        Scene.expect(Scene.selector('#count')).toHaveText('2'),
      )
    })

    it.each(['Story', 'Scene'])(
      'consumes one repeated Command instance in %s',
      runner => {
        const repeatedUpdate = (
          model: Model,
          message: Animation.Message,
        ): Update.Return<Model, Animation.Message> => {
          if (message._tag === 'Showed') {
            return { model, commands: [testCase.command, testCase.command] }
          } else {
            return update(model, message)
          }
        }

        if (runner === 'Story') {
          Story.story(
            repeatedUpdate,
            Story.given(initialModel),
            Story.Command.resolveAll(testCase.resolver),
            Story.message(Animation.Message.Showed()),
            testCase.step,
            Story.Command.expectHas(testCase.command),
            Story.model((model: Model) => expect(model.cleanupCount).toBe(1)),
            testCase.step,
            Story.model((model: Model) => expect(model.cleanupCount).toBe(2)),
          )
        } else {
          Scene.scene(
            { update: repeatedUpdate, view },
            Scene.given(initialModel),
            Scene.Command.resolveAll(testCase.resolver),
            Scene.click(Scene.role('button', { name: 'Start' })),
            testCase.step,
            Scene.Command.expectHas(testCase.command),
            Scene.expect(Scene.selector('#count')).toHaveText('1'),
            testCase.step,
            Scene.expect(Scene.selector('#count')).toHaveText('2'),
          )
        }
      },
    )
  },
)

describe('Animation.test', () => {
  it('accepts a reusable array of mixed entries', () => {
    const entries: ReadonlyArray<
      Animation.test.GenerationStep | Story.Resolver<typeof Prepare>
    > = [Animation.test.paint, [Prepare, Message.CompletedPrepare()]]

    Animation.test.resolveAll(...entries)

    const generalEntries: ReadonlyArray<
      Animation.test.GenerationStep | Story.Resolver
    > = entries

    Animation.test.resolveAll(...generalEntries)
  })

  it('requires each ordinary result Message to belong to its Command', () => {
    Animation.test.resolveAll(
      // @ts-expect-error CompletedCleanup is not a Prepare result Message
      Animation.test.paint,
      [Prepare, Message.CompletedCleanup()],
    )
  })

  describe('Story', () => {
    it('reads generation 2 for paint and settlement through a child fold', () => {
      Story.story(
        update,
        Story.given(initialModel),
        Story.message(Message.ClickedToggle()),
        Animation.test.resolveAll(
          Animation.test.paint,
          Animation.test.settled,
          [Cleanup, Message.CompletedCleanup()],
        ),
        Story.message(Message.ClickedToggle()),
        Animation.test.paint,
        Story.model((model: Model) => {
          expect(model.animation.transitionGeneration).toBe(2)
          expect(model.animation.transitionState).toBe('EnterAnimating')
        }),
        Animation.test.settled,
        Story.model((model: Model) => {
          expect(model.animation.transitionState).toBe('Idle')
        }),
      )
    })

    it('cascades mixed resolvers before and after generation steps', () => {
      Story.story(
        update,
        Story.given(initialModel),
        Story.message(Message.ClickedPrepare()),
        Animation.test.resolveAll(
          Animation.test.settled,
          [Cleanup, Message.CompletedCleanup()],
          Animation.test.paint,
          [Prepare, Message.CompletedPrepare()],
        ),
        Story.model((model: Model) => {
          expect(model.animation.transitionState).toBe('Idle')
          expect(model.animation.isShowing).toBe(false)
          expect(model.cleanupCount).toBe(1)
        }),
      )
    })

    it('uses carried resolvers after a generation step', () => {
      Story.story(
        update,
        Story.given(initialModel),
        Animation.test.resolveAll([Cleanup, Message.CompletedCleanup()]),
        Story.message(Message.ClickedToggle()),
        Animation.test.resolveAll(Animation.test.paint, Animation.test.settled),
        Story.model((model: Model) => expect(model.cleanupCount).toBe(1)),
      )
    })

    it.each([Animation.test.paint, Animation.test.settled])(
      'reports missing Commands for standalone steps',
      step => {
        expect(() =>
          Story.story(update, Story.given(initialModel), step),
        ).toThrow('Pending Commands:')
        expect(() =>
          Story.story(update, Story.given(initialModel), step),
        ).toThrow('(none)')
      },
    )

    it('lists pending Commands in missing-command diagnostics', () => {
      expect(() =>
        Story.story(
          update,
          Story.given(initialModel),
          Story.message(Message.ClickedPrepare()),
          Animation.test.paint,
        ),
      ).toThrow('Prepare')
    })

    it('skips generation entries with no pending Command in resolveAll', () => {
      Story.story(
        update,
        Story.given(initialModel),
        Animation.test.resolveAll(Animation.test.paint, Animation.test.settled),
      )
    })
  })

  describe('Scene', () => {
    it('reads generation 2 and renders each resolved phase through a child fold', () => {
      Scene.scene(
        { update, view },
        Scene.given(initialModel),
        Scene.click(Scene.role('button', { name: 'Toggle' })),
        Animation.test.resolveAll(
          Animation.test.paint,
          Animation.test.settled,
          [Cleanup, Message.CompletedCleanup()],
        ),
        Scene.click(Scene.role('button', { name: 'Toggle' })),
        Scene.Command.expectHas(Animation.WaitForPaint({ generation: 2 })),
        Animation.test.paint,
        Scene.expect(Scene.selector('#panel')).toHaveAttr('data-enter'),
        Scene.expect(Scene.selector('#panel')).not.toHaveAttr('data-closed'),
        Animation.test.settled,
        Scene.expect(Scene.selector('#panel')).not.toHaveAttr(
          'data-transition',
        ),
      )
    })

    it('cascades mixed resolvers before and after generation steps', () => {
      Scene.scene(
        { update, view },
        Scene.given(initialModel),
        Scene.click(Scene.role('button', { name: 'Prepare' })),
        Animation.test.resolveAll(
          Animation.test.settled,
          [Cleanup, Message.CompletedCleanup()],
          Animation.test.paint,
          [Prepare, Message.CompletedPrepare()],
        ),
        Scene.expect(Scene.selector('#panel')).toBeAbsent(),
        Scene.expect(Scene.selector('#cleanup-count')).toHaveText('1'),
      )
    })

    it('uses carried resolvers after a generation step', () => {
      Scene.scene(
        { update, view },
        Scene.given(initialModel),
        Animation.test.resolveAll([Cleanup, Message.CompletedCleanup()]),
        Scene.click(Scene.role('button', { name: 'Toggle' })),
        Animation.test.resolveAll(Animation.test.paint, Animation.test.settled),
        Scene.expect(Scene.selector('#cleanup-count')).toHaveText('1'),
      )
    })

    it.each([Animation.test.paint, Animation.test.settled])(
      'reports missing Commands for standalone steps',
      step => {
        expect(() =>
          Scene.scene({ update, view }, Scene.given(initialModel), step),
        ).toThrow('Pending Commands:')
        expect(() =>
          Scene.scene({ update, view }, Scene.given(initialModel), step),
        ).toThrow('(none)')
      },
    )

    it('lists pending Commands in missing-command diagnostics', () => {
      expect(() =>
        Scene.scene(
          { update, view },
          Scene.given(initialModel),
          Scene.click(Scene.role('button', { name: 'Prepare' })),
          Animation.test.paint,
        ),
      ).toThrow('Prepare')
    })

    it('skips generation entries with no pending Command in resolveAll', () => {
      Scene.scene(
        { update, view },
        Scene.given(initialModel),
        Animation.test.resolveAll(Animation.test.paint, Animation.test.settled),
      )
    })
  })
})

const pairUpdate = (model: ReadonlyArray<number>, message: Animation.Message) =>
  Animation.Message.match<
    Update.Return<ReadonlyArray<number>, Animation.Message>
  >(message, {
    Showed: () => ({
      model,
      commands: [
        Animation.WaitForPaint({ generation: 1 }),
        Animation.WaitForPaint({ generation: 2 }),
      ],
    }),
    Hid: () => ({ model }),
    CompletedWaitForPaint: ({ generation }) => ({
      model: [...model, generation],
      commands: [
        Animation.WaitForAnimationSettled({ id: 'panel', generation }),
      ],
    }),
    EndedAnimation: ({ generation }) => ({ model: [...model, -generation] }),
  })

const pairView = (
  model: ReadonlyArray<number>,
  h: HtmlBuilder<Animation.Message>,
) =>
  h.div(
    [],
    [
      h.button([h.OnClick(Animation.Message.Showed())], ['Start']),
      h.p([h.Id('generations')], [model.join(',')]),
    ],
  )

describe.each(['Story', 'Scene'])(
  'Animation.test ordered dispatches in %s',
  runner => {
    it('consumes repeated steps once each and reads each pending generation', () => {
      const resolvePair = Animation.test.resolveAll(
        Animation.test.paint,
        Animation.test.paint,
        Animation.test.settled,
        Animation.test.settled,
      )

      if (runner === 'Story') {
        Story.story(
          pairUpdate,
          Story.given([]),
          Story.message(Animation.Message.Showed()),
          resolvePair,
          Story.model((model: ReadonlyArray<number>) =>
            expect(model).toEqual([1, 2, -1, -2]),
          ),
        )
      } else {
        Scene.scene(
          { update: pairUpdate, view: pairView },
          Scene.given([]),
          Scene.click(Scene.role('button', { name: 'Start' })),
          resolvePair,
          Scene.expect(Scene.selector('#generations')).toHaveText('1,2,-1,-2'),
        )
      }
    })

    it('resolves one of two identical pending Commands per step', () => {
      const duplicateUpdate = (
        model: ReadonlyArray<number>,
        message: Animation.Message,
      ): Update.Return<ReadonlyArray<number>, Animation.Message> => {
        if (message._tag === 'Showed') {
          return {
            model,
            commands: [
              Animation.WaitForPaint({ generation: 2 }),
              Animation.WaitForPaint({ generation: 2 }),
            ],
          }
        } else {
          return pairUpdate(model, message)
        }
      }
      const resolveDuplicates = Animation.test.resolveAll(
        Animation.test.paint,
        Animation.test.paint,
        Animation.test.settled,
        Animation.test.settled,
      )

      if (runner === 'Story') {
        Story.story(
          duplicateUpdate,
          Story.given([]),
          Story.message(Animation.Message.Showed()),
          resolveDuplicates,
          Story.model((model: ReadonlyArray<number>) =>
            expect(model).toEqual([2, 2, -2, -2]),
          ),
        )
      } else {
        Scene.scene(
          { update: duplicateUpdate, view: pairView },
          Scene.given([]),
          Scene.click(Scene.role('button', { name: 'Start' })),
          resolveDuplicates,
          Scene.expect(Scene.selector('#generations')).toHaveText('2,2,-2,-2'),
        )
      }
    })
  },
)
