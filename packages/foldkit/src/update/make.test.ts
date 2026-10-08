import { Schema } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { type Return, make } from './update.js'

const Message = defineMessageUnion({
  ClickedLoadProfile: {},
  ClickedLoadPreferences: {},
  CompletedLoadProfile: {},
  CompletedLoadPreferences: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

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

  it('rejects an OutMessage that the update contract would discard', () => {
    // @ts-expect-error A plain update cannot return an OutMessage.
    make((model: Model, message: Message) =>
      Message.match(message, {
        ClickedLoadProfile: () => ({ model }),
        ClickedLoadPreferences: () => ({
          model,
          outMessage: 'unexpected',
        }),
        CompletedLoadProfile: () => ({ model }),
        CompletedLoadPreferences: () => ({ model }),
      }),
    )
  })
})
