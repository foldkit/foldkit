import { Option } from 'effect'
import { Test } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { CreateRoom, JoinRoom } from '../command'
import {
  ChangedRoomId,
  ChangedUsername,
  CompletedFocusRoomIdInput,
  CompletedFocusUsernameInput,
  FailedJoinRoom,
  PressedKey,
  SubmittedJoinRoomForm,
  SubmittedUsernameForm,
  SucceededCreateRoom,
  SucceededJoinRoom,
} from '../message'
import { EnterRoomId, EnterUsername, SelectAction } from '../model'
import { FocusRoomIdInput, FocusUsernameInput } from './handleKeyPressed'
import { update } from './update'

const alice = { id: 'p1', username: 'alice' }

const withEnterUsernameStep = () =>
  Test.with({
    homeStep: EnterUsername({ username: '' }),
    formError: Option.none(),
  })

const withSelectActionStep = () =>
  Test.with({
    homeStep: SelectAction({
      username: 'alice',
      selectedAction: 'CreateRoom',
    }),
    formError: Option.none(),
  })

const withEnterRoomIdStep = () =>
  Test.with({
    homeStep: EnterRoomId({ username: 'alice', roomId: '' }),
    formError: Option.none(),
  })

describe('entering a username', () => {
  test('typing updates the username', () => {
    Test.story(
      update,
      withEnterUsernameStep(),
      Test.message(ChangedUsername({ value: 'alice' })),
      Test.tap(({ model }) => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterUsername',
          username: 'alice',
        })
      }),
    )
  })

  test('submitting advances to action selection', () => {
    Test.story(
      update,
      withEnterUsernameStep(),
      Test.message(ChangedUsername({ value: 'alice' })),
      Test.message(SubmittedUsernameForm()),
      Test.tap(({ model }) => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          username: 'alice',
          selectedAction: 'CreateRoom',
        })
      }),
    )
  })

  test('submitting with an empty username does nothing', () => {
    Test.story(
      update,
      withEnterUsernameStep(),
      Test.message(SubmittedUsernameForm()),
      Test.tap(({ model }) => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    )
  })
})

describe('selecting an action', () => {
  test('ArrowDown cycles through actions with wraparound', () => {
    Test.story(
      update,
      withSelectActionStep(),
      Test.message(PressedKey({ key: 'ArrowDown' })),
      Test.tap(({ model }) => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
      Test.message(PressedKey({ key: 'ArrowDown' })),
      Test.tap(({ model }) => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
      Test.message(PressedKey({ key: 'ArrowDown' })),
      Test.tap(({ model }) => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'CreateRoom',
        })
      }),
    )
  })

  test('ArrowUp wraps from first to last', () => {
    Test.story(
      update,
      withSelectActionStep(),
      Test.message(PressedKey({ key: 'ArrowUp' })),
      Test.tap(({ model }) => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
    )
  })

  test('selecting JoinRoom transitions to room ID input', () => {
    Test.story(
      update,
      withSelectActionStep(),
      Test.message(PressedKey({ key: 'ArrowDown' })),
      Test.message(PressedKey({ key: 'Enter' })),
      Test.resolve(FocusRoomIdInput, CompletedFocusRoomIdInput()),
      Test.tap(({ model }) => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          username: 'alice',
          roomId: '',
        })
      }),
    )
  })

  test('selecting ChangeUsername goes back to username input', () => {
    Test.story(
      update,
      withSelectActionStep(),
      Test.message(PressedKey({ key: 'ArrowDown' })),
      Test.message(PressedKey({ key: 'ArrowDown' })),
      Test.message(PressedKey({ key: 'Enter' })),
      Test.resolve(FocusUsernameInput, CompletedFocusUsernameInput()),
      Test.tap(({ model }) => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    )
  })

  test('selecting CreateRoom creates the room and signals the parent', () => {
    Test.story(
      update,
      withSelectActionStep(),
      Test.message(PressedKey({ key: 'Enter' })),
      Test.resolve(
        CreateRoom,
        SucceededCreateRoom({ roomId: 'r1', player: alice }),
      ),
      Test.tap(({ outMessage }) => {
        expect(outMessage).toMatchObject({
          _tag: 'Some',
          value: { _tag: 'SucceededCreateRoom' },
        })
      }),
    )
  })
})

describe('joining a room', () => {
  test('typing a room ID updates the model', () => {
    Test.story(
      update,
      withEnterRoomIdStep(),
      Test.message(ChangedRoomId({ value: 'abc' })),
      Test.tap(({ model }) => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          roomId: 'abc',
        })
      }),
    )
  })

  test('typing clears a previous error', () => {
    Test.story(
      update,
      Test.with({
        homeStep: EnterRoomId({ username: 'alice', roomId: '' }),
        formError: Option.some('Room not found'),
      }),
      Test.message(ChangedRoomId({ value: 'abc' })),
      Test.tap(({ model }) => {
        expect(Option.isNone(model.formError)).toBe(true)
      }),
    )
  })

  test('submitting joins the room and signals the parent', () => {
    Test.story(
      update,
      withEnterRoomIdStep(),
      Test.message(ChangedRoomId({ value: 'r1' })),
      Test.message(SubmittedJoinRoomForm()),
      Test.resolve(
        JoinRoom,
        SucceededJoinRoom({ roomId: 'r1', player: alice }),
      ),
      Test.tap(({ outMessage }) => {
        expect(outMessage).toMatchObject({
          _tag: 'Some',
          value: { _tag: 'SucceededJoinRoom' },
        })
      }),
    )
  })

  test('a failed join sets the error', () => {
    Test.story(
      update,
      withEnterRoomIdStep(),
      Test.message(FailedJoinRoom({ error: 'Room not found' })),
      Test.tap(({ model }) => {
        expect(model.formError).toMatchObject({
          _tag: 'Some',
          value: 'Room not found',
        })
      }),
    )
  })

  test('typing "exit" goes back to action selection', () => {
    Test.story(
      update,
      withEnterRoomIdStep(),
      Test.message(ChangedRoomId({ value: 'exit' })),
      Test.message(SubmittedJoinRoomForm()),
      Test.tap(({ model }) => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
    )
  })
})
