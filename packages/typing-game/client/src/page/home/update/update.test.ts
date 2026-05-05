import { Option } from 'effect'
import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { CreateRoom, JoinRoom } from '../command'
import {
  ChangedRoomId,
  ChangedUsername,
  FailedJoinRoom,
  PressedKey,
  SubmittedJoinRoomForm,
  SubmittedUsernameForm,
  SucceededCreateRoom,
  SucceededJoinRoom,
} from '../message'
import { EnterRoomId, EnterUsername, SelectAction } from '../model'
import { update } from './update'

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
      update,
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
      update,
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
      update,
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
      update,
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
      update,
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
      update,
      withSelectActionStep(),
      Story.message(PressedKey({ key: 'ArrowDown' })),
      Story.message(PressedKey({ key: 'Enter' })),
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
      update,
      withSelectActionStep(),
      Story.message(PressedKey({ key: 'ArrowDown' })),
      Story.message(PressedKey({ key: 'ArrowDown' })),
      Story.message(PressedKey({ key: 'Enter' })),
      Story.model(model => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    )
  })

  test('selecting CreateRoom creates the room and signals the parent', () => {
    Story.story(
      update,
      withSelectActionStep(),
      Story.message(PressedKey({ key: 'Enter' })),
      Story.resolve(
        CreateRoom,
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
      update,
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
      update,
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
      update,
      withEnterRoomIdStep(),
      Story.message(ChangedRoomId({ value: 'r1' })),
      Story.message(SubmittedJoinRoomForm()),
      Story.resolve(
        JoinRoom,
        SucceededJoinRoom({ roomId: 'r1', player: alice }),
      ),
      Story.expectOutMessage(
        SucceededJoinRoom({ roomId: 'r1', player: alice }),
      ),
    )
  })

  test('a failed join sets the error', () => {
    Story.story(
      update,
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
      update,
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
