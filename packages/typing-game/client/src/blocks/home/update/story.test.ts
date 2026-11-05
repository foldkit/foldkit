import { Option } from 'effect'
import {
  Command,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
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
  given({
    homeStep: HomeStep.EnterUsername({ username: '' }),
    formError: Option.none(),
  })

const givenSelectActionStep = () =>
  given({
    homeStep: HomeStep.SelectAction({
      username: 'alice',
      selectedAction: 'CreateRoom',
    }),
    formError: Option.none(),
  })

const givenEnterRoomIdStep = () =>
  given({
    homeStep: HomeStep.EnterRoomId({ username: 'alice', roomId: '' }),
    formError: Option.none(),
  })

describe('entering a username', () => {
  it.effect('typing updates the username', () =>
    story(
      homeSubject,
      givenEnterUsernameStep(),
      message(Message.ChangedUsername({ value: 'alice' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterUsername',
          username: 'alice',
        })
      }),
    ),
  )

  it.effect('submitting advances to action selection', () =>
    story(
      homeSubject,
      givenEnterUsernameStep(),
      message(Message.ChangedUsername({ value: 'alice' })),
      message(Message.SubmittedUsernameForm()),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          username: 'alice',
          selectedAction: 'CreateRoom',
        })
      }),
    ),
  )

  it.effect('submitting with an empty username does nothing', () =>
    story(
      homeSubject,
      givenEnterUsernameStep(),
      message(Message.SubmittedUsernameForm()),
      model(model => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    ),
  )
})

describe('selecting an action', () => {
  it.effect('ArrowDown cycles through actions with wraparound', () =>
    story(
      homeSubject,
      givenSelectActionStep(),
      message(Message.PressedKey({ key: 'ArrowDown' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
      message(Message.PressedKey({ key: 'ArrowDown' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
      message(Message.PressedKey({ key: 'ArrowDown' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'CreateRoom',
        })
      }),
    ),
  )

  it.effect('ArrowUp wraps from first to last', () =>
    story(
      homeSubject,
      givenSelectActionStep(),
      message(Message.PressedKey({ key: 'ArrowUp' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
    ),
  )

  it.effect('selecting JoinRoom transitions to room ID input', () =>
    story(
      homeSubject,
      givenSelectActionStep(),
      message(Message.PressedKey({ key: 'ArrowDown' })),
      message(Message.PressedKey({ key: 'Enter' })),
      Command.resolve(FocusRoomIdInput, Message.CompletedFocusRoomIdInput()),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          username: 'alice',
          roomId: '',
        })
      }),
    ),
  )

  it.effect('selecting ChangeUsername goes back to username input', () =>
    story(
      homeSubject,
      givenSelectActionStep(),
      message(Message.PressedKey({ key: 'ArrowDown' })),
      message(Message.PressedKey({ key: 'ArrowDown' })),
      message(Message.PressedKey({ key: 'Enter' })),
      Command.resolve(
        FocusUsernameInput,
        Message.CompletedFocusUsernameInput(),
      ),
      model(model => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    ),
  )

  it.effect(
    'selecting CreateRoom creates the room and signals the parent',
    () =>
      story(
        homeSubject,
        givenSelectActionStep(),
        message(Message.PressedKey({ key: 'Enter' })),
        Command.resolve(
          CreateRoom,
          Message.SucceededCreateRoom({ roomId: 'r1', player: alice }),
        ),
        expectOutMessage(
          OutMessage.CreatedRoom({ roomId: 'r1', player: alice }),
        ),
      ),
  )
})

describe('joining a room', () => {
  it.effect('typing a room ID updates the model', () =>
    story(
      homeSubject,
      givenEnterRoomIdStep(),
      message(Message.ChangedRoomId({ value: 'abc' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          roomId: 'abc',
        })
      }),
    ),
  )

  it.effect('typing clears a previous error', () =>
    story(
      homeSubject,
      given({
        homeStep: HomeStep.EnterRoomId({ username: 'alice', roomId: '' }),
        formError: Option.some('Room not found'),
      }),
      message(Message.ChangedRoomId({ value: 'abc' })),
      model(model => {
        expect(Option.isNone(model.formError)).toBe(true)
      }),
    ),
  )

  it.effect('submitting joins the room and signals the parent', () =>
    story(
      homeSubject,
      givenEnterRoomIdStep(),
      message(Message.ChangedRoomId({ value: 'r1' })),
      message(Message.SubmittedJoinRoomForm()),
      Command.resolve(
        JoinRoomFromHome,
        Message.SucceededJoinRoomFromHome({ roomId: 'r1', player: alice }),
      ),
      expectOutMessage(OutMessage.JoinedRoom({ roomId: 'r1', player: alice })),
    ),
  )

  it.effect('a failed join sets the error', () =>
    story(
      homeSubject,
      givenEnterRoomIdStep(),
      message(Message.FailedJoinRoomFromHome({ error: 'Room not found' })),
      model(model => {
        expect(model.formError).toMatchObject({
          _tag: 'Some',
          value: 'Room not found',
        })
      }),
    ),
  )

  it.effect('typing "exit" goes back to action selection', () =>
    story(
      homeSubject,
      givenEnterRoomIdStep(),
      message(Message.ChangedRoomId({ value: 'exit' })),
      message(Message.SubmittedJoinRoomForm()),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
    ),
  )
})
