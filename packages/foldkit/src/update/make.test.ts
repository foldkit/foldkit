import { Option, Schema } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import {
  type FoldWithOutMessage,
  type Return,
  type ReturnWithOutMessage,
  foldChild,
  make,
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
