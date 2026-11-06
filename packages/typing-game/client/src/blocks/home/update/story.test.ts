import { Option } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  CreateRoom,
  FocusRoomIdInput,
  FocusUsernameInput,
  JoinRoomFromHome,
} from '../command'
import { HomeBlock, layer } from '../index'
import { Message, OutMessage } from '../message'
import { HomeStep } from '../model'

const homeSubject = { block: HomeBlock, layer }

const alice = { id: 'p1', username: 'alice' }

const givenEnterUsernameStep = () =>
  Story.given({
    homeStep: HomeStep.EnterUsername({ username: '' }),
    formError: Option.none(),
  })

const givenSelectActionStep = () =>
  Story.given({
    homeStep: HomeStep.SelectAction({
      username: 'alice',
      selectedAction: 'CreateRoom',
    }),
    formError: Option.none(),
  })

const givenEnterRoomIdStep = () =>
  Story.given({
    homeStep: HomeStep.EnterRoomId({ username: 'alice', roomId: '' }),
    formError: Option.none(),
  })

describe('entering a username', () => {
  it.effect('typing updates the username', () =>
    Story.story(
      homeSubject,
      givenEnterUsernameStep(),
      Story.message(Message.ChangedUsername({ value: 'alice' })),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterUsername',
          username: 'alice',
        })
      }),
    ),
  )

  it.effect('submitting advances to action selection', () =>
    Story.story(
      homeSubject,
      givenEnterUsernameStep(),
      Story.message(Message.ChangedUsername({ value: 'alice' })),
      Story.message(Message.SubmittedUsernameForm()),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          username: 'alice',
          selectedAction: 'CreateRoom',
        })
      }),
    ),
  )

  it.effect('submitting with an empty username does nothing', () =>
    Story.story(
      homeSubject,
      givenEnterUsernameStep(),
      Story.message(Message.SubmittedUsernameForm()),
      Story.model(model => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    ),
  )
})

describe('selecting an action', () => {
  it.effect('ArrowDown cycles through actions with wraparound', () =>
    Story.story(
      homeSubject,
      givenSelectActionStep(),
      Story.message(Message.PressedKey({ key: 'ArrowDown' })),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
      Story.message(Message.PressedKey({ key: 'ArrowDown' })),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
      Story.message(Message.PressedKey({ key: 'ArrowDown' })),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'CreateRoom',
        })
      }),
    ),
  )

  it.effect('ArrowUp wraps from first to last', () =>
    Story.story(
      homeSubject,
      givenSelectActionStep(),
      Story.message(Message.PressedKey({ key: 'ArrowUp' })),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
    ),
  )

  it.effect('selecting JoinRoom transitions to room ID input', () =>
    Story.story(
      homeSubject,
      givenSelectActionStep(),
      Story.message(Message.PressedKey({ key: 'ArrowDown' })),
      Story.message(Message.PressedKey({ key: 'Enter' })),
      Story.Command.resolve(
        FocusRoomIdInput,
        Message.CompletedFocusRoomIdInput(),
      ),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          username: 'alice',
          roomId: '',
        })
      }),
    ),
  )

  it.effect('selecting ChangeUsername goes back to username input', () =>
    Story.story(
      homeSubject,
      givenSelectActionStep(),
      Story.message(Message.PressedKey({ key: 'ArrowDown' })),
      Story.message(Message.PressedKey({ key: 'ArrowDown' })),
      Story.message(Message.PressedKey({ key: 'Enter' })),
      Story.Command.resolve(
        FocusUsernameInput,
        Message.CompletedFocusUsernameInput(),
      ),
      Story.model(model => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    ),
  )

  it.effect(
    'selecting CreateRoom creates the room and signals the parent',
    () =>
      Story.story(
        homeSubject,
        givenSelectActionStep(),
        Story.message(Message.PressedKey({ key: 'Enter' })),
        Story.Command.resolve(
          CreateRoom,
          Message.SucceededCreateRoom({ roomId: 'r1', player: alice }),
        ),
        Story.expectOutMessage(
          OutMessage.CreatedRoom({ roomId: 'r1', player: alice }),
        ),
      ),
  )
})

describe('joining a room', () => {
  it.effect('typing a room ID updates the model', () =>
    Story.story(
      homeSubject,
      givenEnterRoomIdStep(),
      Story.message(Message.ChangedRoomId({ value: 'abc' })),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          roomId: 'abc',
        })
      }),
    ),
  )

  it.effect('typing clears a previous error', () =>
    Story.story(
      homeSubject,
      Story.given({
        homeStep: HomeStep.EnterRoomId({ username: 'alice', roomId: '' }),
        formError: Option.some('Room not found'),
      }),
      Story.message(Message.ChangedRoomId({ value: 'abc' })),
      Story.model(model => {
        expect(Option.isNone(model.formError)).toBe(true)
      }),
    ),
  )

  it.effect('submitting joins the room and signals the parent', () =>
    Story.story(
      homeSubject,
      givenEnterRoomIdStep(),
      Story.message(Message.ChangedRoomId({ value: 'r1' })),
      Story.message(Message.SubmittedJoinRoomForm()),
      Story.Command.resolve(
        JoinRoomFromHome,
        Message.SucceededJoinRoomFromHome({ roomId: 'r1', player: alice }),
      ),
      Story.expectOutMessage(
        OutMessage.JoinedRoom({ roomId: 'r1', player: alice }),
      ),
    ),
  )

  it.effect('a failed join sets the error', () =>
    Story.story(
      homeSubject,
      givenEnterRoomIdStep(),
      Story.message(
        Message.FailedJoinRoomFromHome({ error: 'Room not found' }),
      ),
      Story.model(model => {
        expect(model.formError).toMatchObject({
          _tag: 'Some',
          value: 'Room not found',
        })
      }),
    ),
  )

  it.effect('typing "exit" goes back to action selection', () =>
    Story.story(
      homeSubject,
      givenEnterRoomIdStep(),
      Story.message(Message.ChangedRoomId({ value: 'exit' })),
      Story.message(Message.SubmittedJoinRoomForm()),
      Story.model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
    ),
  )
})
