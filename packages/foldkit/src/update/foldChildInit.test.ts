import { Array, Effect, Option, Schema } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Story from '../test/story.js'
import {
  type FoldContext,
  type Return,
  type ReturnWithOutMessage,
  type Step,
  type StepWithOutMessage,
  foldChildInit,
} from './public.js'

const ChildModel = Schema.Struct({ value: Schema.Number })
type ChildModel = typeof ChildModel.Type

const ParentModel = Schema.Struct({
  child: ChildModel,
  reportedValue: Schema.Number,
})
type ParentModel = typeof ParentModel.Type

const ChildMessage = defineMessageUnion({
  CompletedChildWork: {},
  CompletedChildFollowUp: {},
})
type ChildMessage = typeof ChildMessage.Type

const ParentMessage = defineMessageUnion({
  StartedChild: {},
  GotChildMessage: { message: ChildMessage },
})
type ParentMessage = typeof ParentMessage.Type

const OutMessageStepMessage = defineMessageUnion({
  RecordedChildValue: {},
})
type OutMessageStepMessage = typeof OutMessageStepMessage.Type

const ChildOutMessage = defineMessageUnion({
  ReportedValue: {},
  IgnoredValue: {},
})
type ChildOutMessage = typeof ChildOutMessage.Type

const ParentOutMessage = defineMessageUnion({
  ForwardedValue: {},
  DerivedValue: {},
})
type ParentOutMessage = typeof ParentOutMessage.Type

const toGotChildMessage = (message: ChildMessage): ParentMessage =>
  ParentMessage.GotChildMessage({ message })

const completeChildWork = Command.define('CompleteChildWork', {
  messages: [ChildMessage.CompletedChildWork],
  execute: Effect.succeed(ChildMessage.CompletedChildWork()),
})

const completeChildFollowUp = Command.define('CompleteChildFollowUp', {
  messages: [ChildMessage.CompletedChildFollowUp],
  execute: Effect.succeed(ChildMessage.CompletedChildFollowUp()),
})

const recordChildValue = Command.define('RecordChildValue', {
  messages: [OutMessageStepMessage.RecordedChildValue],
  execute: Effect.succeed(OutMessageStepMessage.RecordedChildValue()),
})

const childInit: Return<ChildModel, ChildMessage> = {
  model: ChildModel.make({ value: 3 }),
  commands: [completeChildWork()],
}

const childInitWithOutMessage: ReturnWithOutMessage<
  ChildModel,
  ChildMessage,
  ChildOutMessage
> = {
  model: ChildModel.make({ value: 3 }),
  commands: [completeChildWork()],
  outMessage: ChildOutMessage.ReportedValue(),
}

const childInitWithIgnoredOutMessage: ReturnWithOutMessage<
  ChildModel,
  ChildMessage,
  ChildOutMessage
> = {
  model: ChildModel.make({ value: 3 }),
  outMessage: ChildOutMessage.IgnoredValue(),
}

const toParentModel = (child: ChildModel): ParentModel =>
  ParentModel.make({ child, reportedValue: 0 })

describe('foldChildInit', () => {
  it('maps a plain child init Model and Commands', () => {
    const parentInit = foldChildInit(childInit, {
      toParentModel,
      toParentMessage: toGotChildMessage,
    })

    expectTypeOf(parentInit).toEqualTypeOf<Return<ParentModel, ParentMessage>>()
    expect(parentInit.model).toEqual({
      child: { value: 3 },
      reportedValue: 0,
    })
    expect(Object.hasOwn(parentInit, 'outMessage')).toBe(false)
    expect((parentInit.commands ?? []).map(command => command.name)).toEqual([
      'CompleteChildWork',
    ])

    const maybeChildCommand = Array.head(parentInit.commands ?? [])
    expect(Option.isSome(maybeChildCommand)).toBe(true)
    if (Option.isSome(maybeChildCommand)) {
      expect(Effect.runSync(maybeChildCommand.value.effect)).toEqual(
        ParentMessage.GotChildMessage({
          message: ChildMessage.CompletedChildWork(),
        }),
      )
    }
  })

  it('infers the parent Model from an inline toParentModel callback', () => {
    const parentInit = foldChildInit(childInit, {
      toParentModel: child => ({ child, reportedValue: 0 }),
      toParentMessage: toGotChildMessage,
    })

    expectTypeOf(parentInit.model).toMatchTypeOf<ParentModel>()
    expectTypeOf(parentInit.model.child).toEqualTypeOf<ChildModel>()

    const foldChildOutMessage = ChildOutMessage.match<
      Step<ParentModel, ParentMessage>
    >({
      ReportedValue: () => model => ({
        model: modifyFields(model, { reportedValue: () => model.child.value }),
      }),
      IgnoredValue: () => model => ({ model }),
    })
    const reportingParentInit = foldChildInit(childInitWithOutMessage, {
      toParentModel: child => ({ child, reportedValue: 0 }),
      toParentMessage: toGotChildMessage,
      foldOutMessage: foldChildOutMessage,
    })

    expectTypeOf(reportingParentInit.model.child).toEqualTypeOf<ChildModel>()
    expect(reportingParentInit.model.reportedValue).toBe(3)
  })

  it('does not call OutMessage handlers when a child init emits none', () => {
    const callbackCounts = { fold: 0, forward: 0 }
    const silentChildInit: ReturnWithOutMessage<
      ChildModel,
      ChildMessage,
      ChildOutMessage
    > = childInit
    const parentInit = foldChildInit(silentChildInit, {
      toParentModel,
      toParentMessage: toGotChildMessage,
      foldOutMessage: (_outMessage: ChildOutMessage) => {
        callbackCounts.fold += 1
        return model => ({ model })
      },
      toParentOutMessage: (_outMessage: ChildOutMessage) => {
        callbackCounts.forward += 1
        return ParentOutMessage.ForwardedValue()
      },
    })

    expect(callbackCounts).toEqual({ fold: 0, forward: 0 })
    expect(Object.hasOwn(parentInit, 'outMessage')).toBe(false)
  })

  it('keeps commandless child and OutMessage folds commandless', () => {
    const parentInit = foldChildInit(
      {
        model: ChildModel.make({ value: 3 }),
        outMessage: ChildOutMessage.ReportedValue(),
      },
      {
        toParentModel,
        toParentMessage: toGotChildMessage,
        foldOutMessage: (_outMessage: ChildOutMessage) => model => ({ model }),
      },
    )

    expectTypeOf(parentInit).toEqualTypeOf<Return<ParentModel, ParentMessage>>()
    expect(parentInit.commands ?? []).toEqual([])
    expect(Object.hasOwn(parentInit, 'outMessage')).toBe(false)
  })

  it('runs a local OutMessage fold against the completed parent Model', () => {
    const foldChildOutMessage = ChildOutMessage.match<
      Step<ParentModel, OutMessageStepMessage>
    >({
      ReportedValue: () => model => ({
        model: modifyFields(model, {
          reportedValue: () => model.child.value,
        }),
        commands: [recordChildValue()],
      }),
      IgnoredValue: () => model => ({ model }),
    })
    const parentInit = foldChildInit(childInitWithOutMessage, {
      toParentModel,
      toParentMessage: toGotChildMessage,
      foldOutMessage: foldChildOutMessage,
    })

    expectTypeOf(parentInit).toEqualTypeOf<
      Return<ParentModel, ParentMessage | OutMessageStepMessage>
    >()
    expect(parentInit.model.reportedValue).toBe(3)
    expect((parentInit.commands ?? []).map(command => command.name)).toEqual([
      'CompleteChildWork',
      'RecordChildValue',
    ])
    expect(Object.hasOwn(parentInit, 'outMessage')).toBe(false)
  })

  it('passes a FoldContext that maps follow-up child Commands with provenance', () => {
    const foldChildOutMessage =
      (
        _outMessage: ChildOutMessage,
        { liftCommand, liftCommands }: FoldContext<ChildMessage, ParentMessage>,
      ): Step<ParentModel, ParentMessage> =>
      model => ({
        model,
        commands: [
          liftCommand(completeChildFollowUp()),
          ...liftCommands([completeChildWork()]),
        ],
      })
    const parentInit = foldChildInit(childInitWithOutMessage, {
      toParentModel,
      toParentMessage: toGotChildMessage,
      foldOutMessage: foldChildOutMessage,
    })

    expect((parentInit.commands ?? []).map(command => command.name)).toEqual([
      'CompleteChildWork',
      'CompleteChildFollowUp',
      'CompleteChildWork',
    ])
    expect(
      (parentInit.commands ?? []).map(command =>
        Effect.runSync(command.effect),
      ),
    ).toEqual([
      ParentMessage.GotChildMessage({
        message: ChildMessage.CompletedChildWork(),
      }),
      ParentMessage.GotChildMessage({
        message: ChildMessage.CompletedChildFollowUp(),
      }),
      ParentMessage.GotChildMessage({
        message: ChildMessage.CompletedChildWork(),
      }),
    ])

    const parentUpdate = (model: ParentModel, message: ParentMessage) =>
      ParentMessage.match<Return<ParentModel, ParentMessage>>(message, {
        StartedChild: () => parentInit,
        GotChildMessage: () => ({ model }),
      })
    Story.story(
      parentUpdate,
      Story.given(
        ParentModel.make({
          child: ChildModel.make({ value: 0 }),
          reportedValue: 0,
        }),
      ),
      Story.message(ParentMessage.StartedChild()),
      Story.Command.resolve(
        completeChildFollowUp,
        ChildMessage.CompletedChildFollowUp(),
      ),
      Story.Command.resolveAll(
        [completeChildWork, ChildMessage.CompletedChildWork()],
        [completeChildWork, ChildMessage.CompletedChildWork()],
      ),
    )
  })

  it('derives a parent OutMessage from a StepWithOutMessage fold', () => {
    const foldChildOutMessage = ChildOutMessage.match<
      StepWithOutMessage<
        ParentModel,
        ParentMessage,
        typeof ParentOutMessage.DerivedValue.Type
      >
    >({
      ReportedValue: () => model => ({
        model,
        outMessage: ParentOutMessage.DerivedValue(),
      }),
      IgnoredValue: () => model => ({ model }),
    })
    const parentInit = foldChildInit(childInitWithOutMessage, {
      toParentModel,
      toParentMessage: toGotChildMessage,
      foldOutMessage: foldChildOutMessage,
    })

    expectTypeOf(parentInit).toMatchTypeOf<
      ReturnWithOutMessage<
        ParentModel,
        ParentMessage,
        typeof ParentOutMessage.DerivedValue.Type
      >
    >()
    expect(parentInit.outMessage).toEqual(ParentOutMessage.DerivedValue())
  })

  it('forwards a child OutMessage when no local fold is needed', () => {
    const parentInit = foldChildInit(childInitWithOutMessage, {
      toParentModel,
      toParentMessage: toGotChildMessage,
      toParentOutMessage: () => ParentOutMessage.ForwardedValue(),
    })

    expectTypeOf(parentInit).toEqualTypeOf<
      ReturnWithOutMessage<
        ParentModel,
        ParentMessage,
        typeof ParentOutMessage.ForwardedValue.Type
      >
    >()
    expect(parentInit.outMessage).toEqual(ParentOutMessage.ForwardedValue())
  })

  it('omits a partially forwarded OutMessage', () => {
    const parentInit = foldChildInit(childInitWithIgnoredOutMessage, {
      toParentModel,
      toParentMessage: toGotChildMessage,
      toParentOutMessage: ChildOutMessage.match({
        ReportedValue: () => ParentOutMessage.ForwardedValue(),
        IgnoredValue: () => undefined,
      }),
    })

    expect(parentInit.outMessage).toBeUndefined()
    expect(Object.hasOwn(parentInit, 'outMessage')).toBe(false)
  })

  it('forwards after an optional local fold that emits no OutMessage', () => {
    const parentInit = foldChildInit(childInitWithOutMessage, {
      toParentModel,
      toParentMessage: toGotChildMessage,
      foldOutMessage: (_outMessage: ChildOutMessage) => model => ({
        model: modifyFields(model, { reportedValue: () => model.child.value }),
        commands: [recordChildValue()],
      }),
      toParentOutMessage: () => ParentOutMessage.ForwardedValue(),
    })

    expect(parentInit.model.reportedValue).toBe(3)
    expect((parentInit.commands ?? []).map(command => command.name)).toEqual([
      'CompleteChildWork',
      'RecordChildValue',
    ])
    expect(parentInit.outMessage).toEqual(ParentOutMessage.ForwardedValue())
  })

  it('uses a derived OutMessage instead of calling the forward adapter', () => {
    const callbackCounts = { forward: 0 }
    const parentInit = foldChildInit(childInitWithOutMessage, {
      toParentModel,
      toParentMessage: toGotChildMessage,
      foldOutMessage: (_outMessage: ChildOutMessage) => model => ({
        model,
        outMessage: ParentOutMessage.DerivedValue(),
      }),
      toParentOutMessage: () => {
        callbackCounts.forward += 1
        return ParentOutMessage.ForwardedValue()
      },
    })

    expectTypeOf(parentInit).toEqualTypeOf<
      ReturnWithOutMessage<ParentModel, ParentMessage, ParentOutMessage>
    >()
    expect(callbackCounts.forward).toBe(0)
    expect(parentInit.outMessage).toEqual(ParentOutMessage.DerivedValue())
  })
})

describe('foldChildInit inference', () => {
  const ChildRequirements = Schema.Struct({ childService: Schema.String })
  type ChildRequirements = typeof ChildRequirements.Type
  const OutMessageStepRequirements = Schema.Struct({
    outMessageService: Schema.String,
  })
  type OutMessageStepRequirements = typeof OutMessageStepRequirements.Type

  const completeChildWorkWithRequirements: Command.Command<
    ChildMessage,
    never,
    ChildRequirements
  > = {
    name: 'CompleteChildWorkWithRequirements',
    effect: Effect.context<ChildRequirements>().pipe(
      Effect.as(ChildMessage.CompletedChildWork()),
    ),
  }
  const recordChildValueWithRequirements: Command.Command<
    OutMessageStepMessage,
    never,
    OutMessageStepRequirements
  > = {
    name: 'RecordChildValueWithRequirements',
    effect: Effect.context<OutMessageStepRequirements>().pipe(
      Effect.as(OutMessageStepMessage.RecordedChildValue()),
    ),
  }
  const childInitWithRequirements: ReturnWithOutMessage<
    ChildModel,
    ChildMessage,
    ChildOutMessage,
    ChildRequirements
  > = {
    model: ChildModel.make({ value: 3 }),
    commands: [completeChildWorkWithRequirements],
    outMessage: ChildOutMessage.ReportedValue(),
  }
  const plainChildInitWithRequirements: Return<
    ChildModel,
    ChildMessage,
    ChildRequirements
  > = {
    model: ChildModel.make({ value: 3 }),
    commands: [completeChildWorkWithRequirements],
  }
  const foldChildOutMessage = ChildOutMessage.match<
    Step<ParentModel, OutMessageStepMessage, OutMessageStepRequirements>
  >({
    ReportedValue: () => model => ({
      model,
      commands: [recordChildValueWithRequirements],
    }),
    IgnoredValue: () => model => ({ model }),
  })
  const foldChildOutMessageWithDerivedParentOutMessage = ChildOutMessage.match<
    StepWithOutMessage<
      ParentModel,
      OutMessageStepMessage,
      typeof ParentOutMessage.DerivedValue.Type,
      OutMessageStepRequirements
    >
  >({
    ReportedValue: () => model => ({
      model,
      commands: [recordChildValueWithRequirements],
      outMessage: ParentOutMessage.DerivedValue(),
    }),
    IgnoredValue: () => model => ({ model }),
  })
  const forwardChildOutMessage = ChildOutMessage.match({
    ReportedValue: () => ParentOutMessage.ForwardedValue(),
    IgnoredValue: () => undefined,
  })

  it('unifies child and OutMessage fold Message and service requirements', () => {
    const parentInit = foldChildInit(childInitWithRequirements, {
      toParentModel,
      toParentMessage: toGotChildMessage,
      foldOutMessage: foldChildOutMessage,
    })

    expectTypeOf(parentInit).toEqualTypeOf<
      Return<
        ParentModel,
        ParentMessage | OutMessageStepMessage,
        ChildRequirements | OutMessageStepRequirements
      >
    >()
  })

  it('keeps requirements from a plain child init', () => {
    const parentInit = foldChildInit(plainChildInitWithRequirements, {
      toParentModel,
      toParentMessage: toGotChildMessage,
    })

    expectTypeOf(parentInit).toEqualTypeOf<
      Return<ParentModel, ParentMessage, ChildRequirements>
    >()
  })

  it('unifies Message and service requirements for a derived parent OutMessage', () => {
    const parentInit = foldChildInit(childInitWithRequirements, {
      toParentModel,
      toParentMessage: toGotChildMessage,
      foldOutMessage: foldChildOutMessageWithDerivedParentOutMessage,
    })

    expectTypeOf(parentInit).toEqualTypeOf<
      ReturnWithOutMessage<
        ParentModel,
        ParentMessage | OutMessageStepMessage,
        typeof ParentOutMessage.DerivedValue.Type,
        ChildRequirements | OutMessageStepRequirements
      >
    >()
  })

  it('unifies Message and service requirements for forwarding with a local fold', () => {
    const parentInit = foldChildInit(childInitWithRequirements, {
      toParentModel,
      toParentMessage: toGotChildMessage,
      foldOutMessage: foldChildOutMessage,
      toParentOutMessage: forwardChildOutMessage,
    })

    expectTypeOf(parentInit).toEqualTypeOf<
      ReturnWithOutMessage<
        ParentModel,
        ParentMessage | OutMessageStepMessage,
        typeof ParentOutMessage.ForwardedValue.Type,
        ChildRequirements | OutMessageStepRequirements
      >
    >()
  })

  it('defaults forwarding without a local fold to the child requirements and Message', () => {
    const parentInit = foldChildInit(childInitWithRequirements, {
      toParentModel,
      toParentMessage: toGotChildMessage,
      toParentOutMessage: forwardChildOutMessage,
    })

    expectTypeOf(parentInit).toMatchTypeOf<
      ReturnWithOutMessage<
        ParentModel,
        ParentMessage,
        typeof ParentOutMessage.ForwardedValue.Type,
        ChildRequirements
      >
    >()
  })

  it('rejects a parent factory that cannot supply the OutMessage fold Model', () => {
    const toIncompleteParentModel = (child: ChildModel) => ({ child })

    // @ts-expect-error the OutMessage fold needs reportedValue in the parent Model
    foldChildInit(childInitWithRequirements, {
      toParentModel: toIncompleteParentModel,
      toParentMessage: toGotChildMessage,
      foldOutMessage: foldChildOutMessage,
    })
  })

  it('rejects OutMessage-bearing child init results without a handler', () => {
    // @ts-expect-error an OutMessage child init needs a fold or forwarding adapter
    foldChildInit(childInitWithOutMessage, {
      toParentModel,
      toParentMessage: toGotChildMessage,
    })

    foldChildInit(
      {
        model: ChildModel.make({ value: 3 }),
        // @ts-expect-error literal OutMessages need a fold or forwarding adapter
        outMessage: ChildOutMessage.ReportedValue(),
      },
      {
        toParentModel,
        toParentMessage: toGotChildMessage,
      },
    )
  })

  it('is data-first only', () => {
    const rejectedDataLastCall = () => {
      // @ts-expect-error foldChildInit accepts childInit first and does not return a Step
      foldChildInit({
        toParentModel,
        toParentMessage: toGotChildMessage,
      })(childInit)
    }

    expect(rejectedDataLastCall).toBeTypeOf('function')
  })
})
