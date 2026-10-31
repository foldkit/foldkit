import { Effect, Layer, Option } from 'effect'
import {
  Command,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { RoomsClient } from '../services'
import {
  CreateRoom,
  FocusRoomIdInput,
  FocusUsernameInput,
  Home,
  HomeLive,
  HomeStep,
  JoinRoomFromHome,
} from './home'

const RoomsClientTestLayer = Layer.mock(RoomsClient, {})

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
      HomeLive,
      givenEnterUsernameStep(),
      message(Home.Message.ChangedUsername({ value: 'alice' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterUsername',
          username: 'alice',
        })
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect('submitting advances to action selection', () =>
    story(
      HomeLive,
      givenEnterUsernameStep(),
      message(Home.Message.ChangedUsername({ value: 'alice' })),
      message(Home.Message.SubmittedUsernameForm()),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          username: 'alice',
          selectedAction: 'CreateRoom',
        })
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect('submitting with an empty username does nothing', () =>
    story(
      HomeLive,
      givenEnterUsernameStep(),
      message(Home.Message.SubmittedUsernameForm()),
      model(model => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )
})

describe('selecting an action', () => {
  it.effect('ArrowDown cycles through actions with wraparound', () =>
    story(
      HomeLive,
      givenSelectActionStep(),
      message(Home.Message.PressedKey({ key: 'ArrowDown' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
      message(Home.Message.PressedKey({ key: 'ArrowDown' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
      message(Home.Message.PressedKey({ key: 'ArrowDown' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'CreateRoom',
        })
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect('ArrowUp wraps from first to last', () =>
    story(
      HomeLive,
      givenSelectActionStep(),
      message(Home.Message.PressedKey({ key: 'ArrowUp' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect('selecting JoinRoom transitions to room ID input', () =>
    story(
      HomeLive,
      givenSelectActionStep(),
      message(Home.Message.PressedKey({ key: 'ArrowDown' })),
      message(Home.Message.PressedKey({ key: 'Enter' })),
      Command.resolve(
        FocusRoomIdInput,
        Home.Message.CompletedFocusRoomIdInput(),
      ),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          username: 'alice',
          roomId: '',
        })
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect('selecting ChangeUsername goes back to username input', () =>
    story(
      HomeLive,
      givenSelectActionStep(),
      message(Home.Message.PressedKey({ key: 'ArrowDown' })),
      message(Home.Message.PressedKey({ key: 'ArrowDown' })),
      message(Home.Message.PressedKey({ key: 'Enter' })),
      Command.resolve(
        FocusUsernameInput,
        Home.Message.CompletedFocusUsernameInput(),
      ),
      model(model => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect(
    'selecting CreateRoom creates the room and signals the parent',
    () =>
      story(
        HomeLive,
        givenSelectActionStep(),
        message(Home.Message.PressedKey({ key: 'Enter' })),
        Command.resolve(
          CreateRoom,
          Home.Message.SucceededCreateRoom({ roomId: 'r1', player: alice }),
        ),
        expectOutMessage(
          Home.OutMessage.CreatedRoom({ roomId: 'r1', player: alice }),
        ),
      ).pipe(Effect.provide(RoomsClientTestLayer)),
  )
})

describe('joining a room', () => {
  it.effect('typing a room ID updates the model', () =>
    story(
      HomeLive,
      givenEnterRoomIdStep(),
      message(Home.Message.ChangedRoomId({ value: 'abc' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          roomId: 'abc',
        })
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect('typing clears a previous error', () =>
    story(
      HomeLive,
      given({
        homeStep: HomeStep.EnterRoomId({ username: 'alice', roomId: '' }),
        formError: Option.some('Room not found'),
      }),
      message(Home.Message.ChangedRoomId({ value: 'abc' })),
      model(model => {
        expect(Option.isNone(model.formError)).toBe(true)
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect('submitting joins the room and signals the parent', () =>
    story(
      HomeLive,
      givenEnterRoomIdStep(),
      message(Home.Message.ChangedRoomId({ value: 'r1' })),
      message(Home.Message.SubmittedJoinRoomForm()),
      Command.resolve(
        JoinRoomFromHome,
        Home.Message.SucceededJoinRoomFromHome({ roomId: 'r1', player: alice }),
      ),
      expectOutMessage(
        Home.OutMessage.JoinedRoom({ roomId: 'r1', player: alice }),
      ),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect('a failed join sets the error', () =>
    story(
      HomeLive,
      givenEnterRoomIdStep(),
      message(Home.Message.FailedJoinRoomFromHome({ error: 'Room not found' })),
      model(model => {
        expect(model.formError).toMatchObject({
          _tag: 'Some',
          value: 'Room not found',
        })
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect('typing "exit" goes back to action selection', () =>
    story(
      HomeLive,
      givenEnterRoomIdStep(),
      message(Home.Message.ChangedRoomId({ value: 'exit' })),
      message(Home.Message.SubmittedJoinRoomForm()),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )
})
