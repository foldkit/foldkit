import { Effect, Layer, Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { RoomsClient } from '../../services'
import {
  FocusUserGameTextInput,
  Typing,
  TypingLive,
  UpdatePlayerProgress,
} from './typing'

const RoomsClientTestLayer = Layer.mock(RoomsClient, {})

const game = { id: 'g1', text: 'hello world' }

const progress = {
  playerId: 'p1',
  gameId: game.id,
  userText: 'hel',
  updatedAt: 0,
  charsTyped: 4,
}

describe('typing', () => {
  it.effect('limits wrong characters and reports progress', () =>
    story(
      TypingLive,
      message(
        Typing.Message.ChangedUserText({
          value: 'hexxxxxxxx',
          game,
          playerId: 'p1',
        }),
      ),
      model(model => {
        expect(model).toEqual({ userGameText: 'hexxxxx', charsTyped: 7 })
      }),
      Command.resolveAllExact([
        UpdatePlayerProgress({
          playerId: 'p1',
          gameId: game.id,
          userGameText: 'hexxxxx',
          charsTyped: 7,
        }),
        Typing.Message.CompletedUpdatePlayerProgress(),
      ]),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect('restores saved progress when nothing is typed', () =>
    story(
      TypingLive,
      message(
        Typing.Message.ReceivedPlayerProgress({
          maybePlayerProgress: Option.some(progress),
        }),
      ),
      model(model => {
        expect(model).toEqual({ userGameText: 'hel', charsTyped: 4 })
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect('keeps typed text over saved progress', () =>
    story(
      TypingLive,
      given({ userGameText: 'hello', charsTyped: 6 }),
      message(
        Typing.Message.ReceivedPlayerProgress({
          maybePlayerProgress: Option.some(progress),
        }),
      ),
      model(model => {
        expect(model).toEqual({ userGameText: 'hello', charsTyped: 6 })
      }),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )

  it.effect('a game start clears the text and focuses the input', () =>
    story(
      TypingLive,
      given({ userGameText: 'hello', charsTyped: 6 }),
      message(Typing.Message.InformedOfGameStart()),
      model(model => {
        expect(model).toEqual({ userGameText: '', charsTyped: 0 })
      }),
      Command.resolve(
        FocusUserGameTextInput,
        Typing.Message.CompletedFocusUserGameTextInput(),
      ),
    ).pipe(Effect.provide(RoomsClientTestLayer)),
  )
})
