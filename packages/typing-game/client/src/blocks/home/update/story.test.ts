import { Effect, Option } from 'effect'
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

import { HomeBlock, layer } from '../block'
import {
  CreateRoom,
  FocusRoomIdInput,
  FocusUsernameInput,
  JoinRoomFromHome,
} from '../command'
import { Message, OutMessage } from '../message'
import { HomeStep } from '../model'

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
      HomeBlock,
      givenEnterUsernameStep(),
      message(Message.ChangedUsername({ value: 'alice' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterUsername',
          username: 'alice',
        })
      }),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('submitting advances to action selection', () =>
    story(
      HomeBlock,
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
    ).pipe(Effect.provide(layer)),
  )

  it.effect('submitting with an empty username does nothing', () =>
    story(
      HomeBlock,
      givenEnterUsernameStep(),
      message(Message.SubmittedUsernameForm()),
      model(model => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    ).pipe(Effect.provide(layer)),
  )
})

describe('selecting an action', () => {
  it.effect('ArrowDown cycles through actions with wraparound', () =>
    story(
      HomeBlock,
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
    ).pipe(Effect.provide(layer)),
  )

  it.effect('ArrowUp wraps from first to last', () =>
    story(
      HomeBlock,
      givenSelectActionStep(),
      message(Message.PressedKey({ key: 'ArrowUp' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('selecting JoinRoom transitions to room ID input', () =>
    story(
      HomeBlock,
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
    ).pipe(Effect.provide(layer)),
  )

  it.effect('selecting ChangeUsername goes back to username input', () =>
    story(
      HomeBlock,
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
    ).pipe(Effect.provide(layer)),
  )

  it.effect(
    'selecting CreateRoom creates the room and signals the parent',
    () =>
      story(
        HomeBlock,
        givenSelectActionStep(),
        message(Message.PressedKey({ key: 'Enter' })),
        Command.resolve(
          CreateRoom,
          Message.SucceededCreateRoom({ roomId: 'r1', player: alice }),
        ),
        expectOutMessage(
          OutMessage.CreatedRoom({ roomId: 'r1', player: alice }),
        ),
      ).pipe(Effect.provide(layer)),
  )
})

describe('joining a room', () => {
  it.effect('typing a room ID updates the model', () =>
    story(
      HomeBlock,
      givenEnterRoomIdStep(),
      message(Message.ChangedRoomId({ value: 'abc' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          roomId: 'abc',
        })
      }),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('typing clears a previous error', () =>
    story(
      HomeBlock,
      given({
        homeStep: HomeStep.EnterRoomId({ username: 'alice', roomId: '' }),
        formError: Option.some('Room not found'),
      }),
      message(Message.ChangedRoomId({ value: 'abc' })),
      model(model => {
        expect(Option.isNone(model.formError)).toBe(true)
      }),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('submitting joins the room and signals the parent', () =>
    story(
      HomeBlock,
      givenEnterRoomIdStep(),
      message(Message.ChangedRoomId({ value: 'r1' })),
      message(Message.SubmittedJoinRoomForm()),
      Command.resolve(
        JoinRoomFromHome,
        Message.SucceededJoinRoomFromHome({ roomId: 'r1', player: alice }),
      ),
      expectOutMessage(OutMessage.JoinedRoom({ roomId: 'r1', player: alice })),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('a failed join sets the error', () =>
    story(
      HomeBlock,
      givenEnterRoomIdStep(),
      message(Message.FailedJoinRoomFromHome({ error: 'Room not found' })),
      model(model => {
        expect(model.formError).toMatchObject({
          _tag: 'Some',
          value: 'Room not found',
        })
      }),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('typing "exit" goes back to action selection', () =>
    story(
      HomeBlock,
      givenEnterRoomIdStep(),
      message(Message.ChangedRoomId({ value: 'exit' })),
      message(Message.SubmittedJoinRoomForm()),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
    ).pipe(Effect.provide(layer)),
  )
})
