import { Effect, Option, Schema } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import {
  type FoldWithOutMessage,
  type Return,
  type ReturnWithOutMessage,
  type Step,
  combine,
  foldChild,
  make,
  makeStep,
} from './update.js'

const Message = defineMessageUnion({
  ClickedLoadProfile: {},
  ClickedLoadPreferences: {},
  CompletedLoadProfile: {},
  CompletedLoadPreferences: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const DispatchContext = Schema.Struct({ factor: Schema.Number })
type DispatchContext = typeof DispatchContext.Type

const OutMessage = defineMessageUnion({
  LoadedProfile: {},
})
type OutMessage = typeof OutMessage.Type

const ParentMessage = defineMessageUnion({
  GotChildMessage: { message: Message },
})
type ParentMessage = typeof ParentMessage.Type

const ParentModel = Schema.Struct({ child: Model })
type ParentModel = typeof ParentModel.Type

const LoadProfile = Command.define('LoadProfile', {
  messages: [Message.CompletedLoadProfile],
})

const LoadPreferences = Command.define('LoadPreferences', {
  messages: [Message.CompletedLoadPreferences],
})

const loadPreferences = (
  model: Model,
): Return<Model, Message, Command.Handler<'LoadPreferences'>> => ({
  model,
  commands: [LoadPreferences()],
})

const update = make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedLoadProfile: () => ({
      model,
      commands: [LoadProfile()],
    }),
    ClickedLoadPreferences: () => loadPreferences(model),
    CompletedLoadProfile: () => ({ model }),
    CompletedLoadPreferences: () => ({ model }),
  }),
)

const outwardUpdate = make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedLoadProfile: () => ({ model, commands: [LoadProfile()] }),
    ClickedLoadPreferences: () => loadPreferences(model),
    CompletedLoadProfile: () => ({
      model,
      outMessage: OutMessage.LoadedProfile(),
    }),
    CompletedLoadPreferences: () => ({ model }),
  }),
)

const contextualUpdate = make(
  (model: Model, message: Message, context: DispatchContext) =>
    Message.match(message, {
      ClickedLoadProfile: () => ({
        model: modifyFields(model, {
          count: count => count * context.factor,
        }),
        commands: [LoadProfile()],
      }),
      ClickedLoadPreferences: () => loadPreferences(model),
      CompletedLoadProfile: () => ({
        model,
        outMessage: OutMessage.LoadedProfile(),
      }),
      CompletedLoadPreferences: () => ({ model }),
    }),
)

const optionalContextUpdate = make(
  (model: Model, _message: Message, _context?: DispatchContext) => ({ model }),
)

const modelOnlyUpdate = make((model: Model) => ({ model }))

const loadProfileStep = makeStep(
  (model: Model, _context?: DispatchContext) => ({
    model,
    commands: [LoadProfile()],
  }),
)

const outwardStep = makeStep(
  (model: Model, ..._contexts: ReadonlyArray<DispatchContext>) => ({
    model,
    commands: [LoadPreferences()],
    outMessage: OutMessage.LoadedProfile(),
  }),
)

const modelOnlyStep = makeStep((model: Model) => ({ model }))

const loadPreferencesStep = makeStep((model: Model) => ({
  model,
  commands: [LoadPreferences()],
}))

const restContextUpdate = make(
  (
    model: Model,
    _message: Message,
    ..._contexts: ReadonlyArray<DispatchContext>
  ) => ({ model }),
)

const foldChildUpdate = foldChild({
  update: outwardUpdate,
  read: (model: ParentModel) => Option.some(model.child),
  write: (model, child) => ({ ...model, child }),
  toParentMessage: message => ParentMessage.GotChildMessage({ message }),
  toParentOutMessage: (outMessage: OutMessage) => outMessage,
})

describe('make', () => {
  it('infers the union of Command handler requirements', () => {
    expectTypeOf(update).toEqualTypeOf<
      (
        model: Model,
        message: Message,
      ) => Return<
        Model,
        Message,
        Command.Handler<'LoadProfile'> | Command.Handler<'LoadPreferences'>
      >
    >()
  })

  it('returns the update unchanged at runtime', () => {
    const model = Model.make({ count: 0 })
    const result = update(model, Message.ClickedLoadProfile())

    expect(result.model).toBe(model)
    expect(result.commands?.map(({ name }) => name)).toEqual(['LoadProfile'])
  })

  it('preserves required, optional, and rest context parameters', () => {
    expectTypeOf(contextualUpdate).toEqualTypeOf<
      (
        model: Model,
        message: Message,
        context: DispatchContext,
      ) => ReturnWithOutMessage<
        Model,
        Message,
        OutMessage,
        Command.Handler<'LoadProfile'> | Command.Handler<'LoadPreferences'>
      >
    >()

    expectTypeOf(optionalContextUpdate).toEqualTypeOf<
      (
        model: Model,
        message: Message,
        context?: DispatchContext,
      ) => Return<Model, Message>
    >()

    expectTypeOf(modelOnlyUpdate).toEqualTypeOf<
      (model: Model) => Return<Model, undefined>
    >()

    expectTypeOf(restContextUpdate).toEqualTypeOf<
      (
        model: Model,
        message: Message,
        ...contexts: ReadonlyArray<DispatchContext>
      ) => Return<Model, Message>
    >()
  })

  it('requires every Message branch to return an Update.Return', () => {
    // @ts-expect-error Every branch must return the next Model.
    make((model: Model, message: Message) =>
      Message.match(message, {
        ClickedLoadProfile: () => ({ model }),
        ClickedLoadPreferences: () => 42,
        CompletedLoadProfile: () => ({ model }),
        CompletedLoadPreferences: () => ({ model }),
      }),
    )

    // @ts-expect-error Context parameters do not relax output validation.
    make((_model: Model, _message: Message, _context: DispatchContext) => 42)

    // @ts-expect-error A model-only update must still return the next Model.
    make((_model: Model) => 42)
  })

  it('carries an OutMessage and Command requirements through a child fold', () => {
    expectTypeOf(outwardUpdate).toEqualTypeOf<
      (
        model: Model,
        message: Message,
      ) => ReturnWithOutMessage<
        Model,
        Message,
        OutMessage,
        Command.Handler<'LoadProfile'> | Command.Handler<'LoadPreferences'>
      >
    >()

    expectTypeOf(foldChildUpdate).toEqualTypeOf<
      FoldWithOutMessage<
        ParentModel,
        ParentMessage,
        Message,
        OutMessage,
        Command.Handler<'LoadProfile'> | Command.Handler<'LoadPreferences'>
      >
    >()

    // @ts-expect-error A parent cannot discard the child's OutMessage.
    const plainUpdate: (
      model: Model,
      message: Message,
    ) => Return<Model, Message, unknown> = outwardUpdate

    expect(plainUpdate).toBe(outwardUpdate)

    const parentModel = ParentModel.make({ child: Model.make({ count: 0 }) })
    const result = foldChildUpdate(parentModel, Message.CompletedLoadProfile())

    expect(result.outMessage).toEqual(OutMessage.LoadedProfile())
  })
})

describe('makeStep', () => {
  it('infers Message, requirements, OutMessage, and context parameters', () => {
    expectTypeOf(loadProfileStep).toEqualTypeOf<
      (
        model: Model,
        context?: DispatchContext,
      ) => Return<
        Model,
        typeof Message.CompletedLoadProfile.Type,
        Command.Handler<'LoadProfile'>
      >
    >()
    expectTypeOf(outwardStep).toEqualTypeOf<
      (
        model: Model,
        ...contexts: ReadonlyArray<DispatchContext>
      ) => ReturnWithOutMessage<
        Model,
        typeof Message.CompletedLoadPreferences.Type,
        OutMessage,
        Command.Handler<'LoadPreferences'>
      >
    >()
    expectTypeOf(modelOnlyStep).toEqualTypeOf<
      (model: Model) => Return<Model, never>
    >()
  })

  it('returns the Step unchanged at runtime', () => {
    const model = Model.make({ count: 0 })

    expect(loadProfileStep(model).commands?.map(({ name }) => name)).toEqual([
      'LoadProfile',
    ])
  })

  it('validates the Model return and Command error channel', () => {
    // @ts-expect-error A Step must return its Model type.
    makeStep((_model: Model) => ({ model: 42 }))

    // @ts-expect-error Update Commands cannot fail in the typed error channel.
    makeStep((model: Model) => ({
      model,
      commands: [
        {
          name: 'Failing',
          effect: Effect.fail('boom'),
        },
      ],
    }))
  })
})

describe('combine inference', () => {
  it('unions Message and handler requirements across heterogeneous Steps', () => {
    const combined = combine([loadProfileStep, loadPreferencesStep])
    const model = Model.make({ count: 0 })
    const result = combine(model, [loadProfileStep, loadPreferencesStep])

    expectTypeOf(combined).toEqualTypeOf<
      Step<
        Model,
        | typeof Message.CompletedLoadProfile.Type
        | typeof Message.CompletedLoadPreferences.Type,
        Command.Handler<'LoadProfile'> | Command.Handler<'LoadPreferences'>
      >
    >()
    expectTypeOf(result).toEqualTypeOf<
      Return<
        Model,
        | typeof Message.CompletedLoadProfile.Type
        | typeof Message.CompletedLoadPreferences.Type,
        Command.Handler<'LoadProfile'> | Command.Handler<'LoadPreferences'>
      >
    >()
    expect(combined(model).commands?.map(({ name }) => name)).toEqual([
      'LoadProfile',
      'LoadPreferences',
    ])
  })

  it('validates every Model return and rejects OutMessages', () => {
    if (false) {
      combine([
        loadProfileStep,
        // @ts-expect-error Every Step must return the shared Model.
        (_model: Model) => ({ model: 'wrong' }),
      ])

      combine([
        loadProfileStep,
        // @ts-expect-error combine cannot discard an OutMessage.
        outwardStep,
      ])
    }
  })
})
