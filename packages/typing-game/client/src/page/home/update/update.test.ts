import { Option } from 'effect'
import { DataCommand, Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  CreateRoom,
  FocusRoomIdInput,
  FocusUsernameInput,
  JoinRoom,
  execute,
} from '../command'
import {
  ChangedRoomId,
  ChangedUsername,
  CompletedFocusRoomIdInput,
  CompletedFocusUsernameInput,
  FailedJoinRoom,
  type Message,
  PressedKey,
  SubmittedJoinRoomForm,
  SubmittedUsernameForm,
  SucceededCreateRoom,
  SucceededJoinRoom,
} from '../message'
import { EnterRoomId, EnterUsername, type Model, SelectAction } from '../model'
import { update } from './update'

const interpret = DataCommand.toCommand(execute)
const interpretAll = DataCommand.toCommands(execute)

const interpretedUpdate = (model: Model, message: Message) => {
  const [nextModel, commands, maybeOutMessage] = update(model, message)
  return [nextModel, interpretAll(commands), maybeOutMessage] as const
}

const alice = { id: 'p1', username: 'alice' }

const withEnterUsernameStep = () =>
  Story.with({
    homeStep: EnterUsername({ username: '' }),
    formError: Option.none(),
  })

const withSelectActionStep = () =>
  Story.with({
    homeStep: SelectAction({
      username: 'alice',
      selectedAction: 'CreateRoom',
    }),
    formError: Option.none(),
  })

const withEnterRoomIdStep = () =>
  Story.with({
    homeStep: EnterRoomId({ username: 'alice', roomId: '' }),
    formError: Option.none(),
  })

describe('entering a username', () => {
  test('typing updates the username', () => {
    Story.story(
      interpretedUpdate,
      withEnterUsernameStep(),
      Story.message(ChangedUsername({ value: 'alice' })),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterUsername',
          username: 'alice',
        })
      }),
    )
  })

  test('submitting advances to action selection', () => {
    Story.story(
      interpretedUpdate,
      withEnterUsernameStep(),
      Story.message(ChangedUsername({ value: 'alice' })),
      Story.message(SubmittedUsernameForm()),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          username: 'alice',
          selectedAction: 'CreateRoom',
        })
      }),
    )
  })

  test('submitting with an empty username does nothing', () => {
    Story.story(
      interpretedUpdate,
      withEnterUsernameStep(),
      Story.message(SubmittedUsernameForm()),
      Story.model(model => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    )
  })
})

describe('selecting an action', () => {
  test('ArrowDown cycles through actions with wraparound', () => {
    Story.story(
      interpretedUpdate,
      withSelectActionStep(),
      Story.message(PressedKey({ key: 'ArrowDown' })),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
      Story.message(PressedKey({ key: 'ArrowDown' })),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
      Story.message(PressedKey({ key: 'ArrowDown' })),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'CreateRoom',
        })
      }),
    )
  })

  test('ArrowUp wraps from first to last', () => {
    Story.story(
      interpretedUpdate,
      withSelectActionStep(),
      Story.message(PressedKey({ key: 'ArrowUp' })),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
    )
  })

  test('selecting JoinRoom transitions to room ID input', () => {
    Story.story(
      interpretedUpdate,
      withSelectActionStep(),
      Story.message(PressedKey({ key: 'ArrowDown' })),
      Story.message(PressedKey({ key: 'Enter' })),
      Story.Command.resolve(
        interpret(FocusRoomIdInput()),
        CompletedFocusRoomIdInput(),
      ),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          username: 'alice',
          roomId: '',
        })
      }),
    )
  })

  test('selecting ChangeUsername goes back to username input', () => {
    Story.story(
      interpretedUpdate,
      withSelectActionStep(),
      Story.message(PressedKey({ key: 'ArrowDown' })),
      Story.message(PressedKey({ key: 'ArrowDown' })),
      Story.message(PressedKey({ key: 'Enter' })),
      Story.Command.resolve(
        interpret(FocusUsernameInput()),
        CompletedFocusUsernameInput(),
      ),
      Story.model(model => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    )
  })

  test('selecting CreateRoom creates the room and signals the parent', () => {
    Story.story(
      interpretedUpdate,
      withSelectActionStep(),
      Story.message(PressedKey({ key: 'Enter' })),
      Story.Command.resolve(
        interpret(CreateRoom({ username: 'alice' })),
        SucceededCreateRoom({ roomId: 'r1', player: alice }),
      ),
      Story.expectOutMessage(
        SucceededCreateRoom({ roomId: 'r1', player: alice }),
      ),
    )
  })
})

describe('joining a room', () => {
  test('typing a room ID updates the model', () => {
    Story.story(
      interpretedUpdate,
      withEnterRoomIdStep(),
      Story.message(ChangedRoomId({ value: 'abc' })),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          roomId: 'abc',
        })
      }),
    )
  })

  test('typing clears a previous error', () => {
    Story.story(
      interpretedUpdate,
      Story.with({
        homeStep: EnterRoomId({ username: 'alice', roomId: '' }),
        formError: Option.some('Room not found'),
      }),
      Story.message(ChangedRoomId({ value: 'abc' })),
      Story.model(model => {
        expect(Option.isNone(model.formError)).toBe(true)
      }),
    )
  })

  test('submitting joins the room and signals the parent', () => {
    Story.story(
      interpretedUpdate,
      withEnterRoomIdStep(),
      Story.message(ChangedRoomId({ value: 'r1' })),
      Story.message(SubmittedJoinRoomForm()),
      Story.Command.resolve(
        interpret(JoinRoom({ username: 'alice', roomId: 'r1' })),
        SucceededJoinRoom({ roomId: 'r1', player: alice }),
      ),
      Story.expectOutMessage(
        SucceededJoinRoom({ roomId: 'r1', player: alice }),
      ),
    )
  })

  test('a failed join sets the error', () => {
    Story.story(
      interpretedUpdate,
      withEnterRoomIdStep(),
      Story.message(FailedJoinRoom({ error: 'Room not found' })),
      Story.model(model => {
        expect(model.formError).toMatchObject({
          _tag: 'Some',
          value: 'Room not found',
        })
      }),
    )
  })

  test('typing "exit" goes back to action selection', () => {
    Story.story(
      interpretedUpdate,
      withEnterRoomIdStep(),
      Story.message(ChangedRoomId({ value: 'exit' })),
      Story.message(SubmittedJoinRoomForm()),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
    )
  })
})
