import { Array, Effect, Schema } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Command from './index.js'

const CompletedFetchNotes = Schema.TaggedStruct('CompletedFetchNotes', {
  noteCount: Schema.Number,
})

type ChildMessage = typeof CompletedFetchNotes.Type
type ParentMessage = Readonly<{
  _tag: 'GotNotesMessage'
  message: ChildMessage
}>

const FetchNotes = Command.define('FetchNotes', {
  messages: [CompletedFetchNotes],
  execute: Effect.succeed(CompletedFetchNotes.make({ noteCount: 3 })),
})

const toGotNotesMessage = (message: ChildMessage): ParentMessage => ({
  _tag: 'GotNotesMessage',
  message,
})

// NOTE: These helpers are the regression subjects. Each is generic over the
// Message types, where Command stays a deferred conditional, so each compiles
// only while the mappers are typed against Command itself rather than a
// structural command shape.
const liftCommands = <FromMessage, ToMessage>(
  commands: ReadonlyArray<Command.Command<FromMessage>>,
  toParent: (message: FromMessage) => ToMessage,
): ReadonlyArray<Command.Command<ToMessage>> =>
  Command.mapMessages(commands, toParent)

const liftCommand = <FromMessage, ToMessage>(
  command: Command.Command<FromMessage>,
  toParent: (message: FromMessage) => ToMessage,
): Command.Command<ToMessage> => Command.mapMessage(command, toParent)

const withCrashOnFailure = <Message>(
  command: Command.Command<Message>,
): Command.Command<Message> => Command.mapEffect(command, Effect.orDie)

describe('Command.mapMessages', () => {
  it('unifies with Command inside a combinator generic over both Message types', () => {
    const mappedCommands = liftCommands([FetchNotes()], toGotNotesMessage)

    const dispatchedMessages = Array.map(mappedCommands, command =>
      Effect.runSync(command.effect),
    )
    expect(dispatchedMessages).toEqual([
      {
        _tag: 'GotNotesMessage',
        message: CompletedFetchNotes.make({ noteCount: 3 }),
      },
    ])
  })

  it('preserves Message inference for present Commands in the data-first form', () => {
    const mappedCommands = Command.mapMessages(
      [FetchNotes()],
      toGotNotesMessage,
    )
    expectTypeOf(mappedCommands).toEqualTypeOf<
      ReadonlyArray<Command.Command<ParentMessage>>
    >()
  })

  it('preserves Message inference for present Commands in the curried form', () => {
    const mappedCommands = Command.mapMessages(toGotNotesMessage)([
      FetchNotes(),
    ])
    expectTypeOf(mappedCommands).toEqualTypeOf<
      ReadonlyArray<Command.Command<ParentMessage>>
    >()
  })

  it('maps undefined to a concrete empty array in the data-first form', () => {
    const mappedCommands = Command.mapMessages(undefined, toGotNotesMessage)

    expectTypeOf(mappedCommands).toEqualTypeOf<
      ReadonlyArray<Command.Command<ParentMessage>>
    >()
    expect(mappedCommands).toEqual([])
  })

  it('maps undefined to a concrete empty array in the curried form', () => {
    const mappedCommands = Command.mapMessages(toGotNotesMessage)(undefined)

    expectTypeOf(mappedCommands).toEqualTypeOf<
      ReadonlyArray<Command.Command<ParentMessage>>
    >()
    expect(mappedCommands).toEqual([])
  })
})

describe('Command.mapMessage', () => {
  it('unifies with Command inside a combinator generic over both Message types', () => {
    const mappedCommand = liftCommand(FetchNotes(), toGotNotesMessage)

    expect(mappedCommand.name).toBe('FetchNotes')
    expect(Effect.runSync(mappedCommand.effect)).toEqual({
      _tag: 'GotNotesMessage',
      message: CompletedFetchNotes.make({ noteCount: 3 }),
    })
  })
})

describe('Command.mapEffect', () => {
  it('unifies with Command inside a combinator generic over the Message type', () => {
    const mappedCommand = withCrashOnFailure(FetchNotes())

    expect(Effect.runSync(mappedCommand.effect)).toEqual(
      CompletedFetchNotes.make({ noteCount: 3 }),
    )
  })
})
