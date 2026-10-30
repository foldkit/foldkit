import { clsx } from 'clsx'
import {
  Array,
  Effect,
  Equal,
  Number,
  Option,
  Order,
  Predicate,
  Schema,
  String,
  pipe,
} from 'effect'
import { Block, Command, Dom } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { RoomsClient } from '../../services'

const USER_GAME_TEXT_INPUT_ID = 'userGameText'
const MAX_WRONG_CHARS = 5

const Model = Schema.Struct({
  userGameText: Schema.String,
  charsTyped: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ChangedUserText: {
    value: Schema.String,
    game: Shared.Game,
    playerId: Schema.String,
  },
  InformedOfGameStart: {},
  InformedOfGameEnd: {},
  ReceivedPlayerProgress: {
    maybePlayerProgress: Schema.Option(Shared.PlayerProgress),
  },
  CompletedFocusUserGameTextInput: {},
  CompletedUpdatePlayerProgress: {},
})
type Message = typeof Message.Type

export const UpdatePlayerProgress = Command.define('UpdatePlayerProgress', {
  args: {
    playerId: Schema.String,
    gameId: Schema.String,
    userGameText: Schema.String,
    charsTyped: Schema.Number,
  },
  messages: [Message.CompletedUpdatePlayerProgress],
})

export const FocusUserGameTextInput = Command.define('FocusUserGameTextInput', {
  messages: [Message.CompletedFocusUserGameTextInput],
})

export type TypingViewInput = Readonly<{
  game: Shared.Game
  playerId: string
}>

export class Typing extends Block<Typing, void, TypingViewInput>()('Typing', {
  Model,
  Message,
  Command: [UpdatePlayerProgress, FocusUserGameTextInput],
}) {}

const EMPTY_MODEL: Model = { userGameText: '', charsTyped: 0 }

const findFirstWrongCharIndex =
  (userGameText: string) =>
  (gameText: string): Option.Option<number> =>
    pipe(
      userGameText,
      String.split(''),
      Array.findFirstIndex((char, index) =>
        pipe(
          gameText,
          String.at(index),
          Option.exists(Predicate.not(Equal.equals(char))),
        ),
      ),
    )

const limitWrongChars = (userGameText: string, gameText: string): string =>
  pipe(
    findFirstWrongCharIndex(userGameText)(gameText),
    Option.filter(
      firstWrongIndex =>
        String.length(userGameText) - firstWrongIndex > MAX_WRONG_CHARS,
    ),
    Option.match({
      onNone: () => userGameText,
      onSome: firstWrongIndex =>
        String.slice(0, firstWrongIndex + MAX_WRONG_CHARS)(userGameText),
    }),
  )

const changedUserTextStep = (
  model: Model,
  {
    value,
    game,
    playerId,
  }: Readonly<{ value: string; game: Shared.Game; playerId: string }>,
) => {
  const userGameText = limitWrongChars(value, game.text)
  const nextCharsTyped =
    model.charsTyped +
    Number.max(
      String.length(userGameText) - String.length(model.userGameText),
      0,
    )

  return {
    model: modifyFields(model, {
      userGameText: () => userGameText,
      charsTyped: () => nextCharsTyped,
    }),
    commands: [
      UpdatePlayerProgress({
        playerId,
        gameId: game.id,
        userGameText,
        charsTyped: nextCharsTyped,
      }),
    ],
  }
}

const receivedPlayerProgressStep = (
  model: Model,
  maybePlayerProgress: Option.Option<Shared.PlayerProgress>,
) => {
  if (String.isNonEmpty(model.userGameText)) {
    return { model }
  } else {
    return {
      model: Option.match(maybePlayerProgress, {
        onNone: () => EMPTY_MODEL,
        onSome: ({ userText, charsTyped }) =>
          modifyFields(model, {
            userGameText: () => userText,
            charsTyped: () => charsTyped,
          }),
      }),
    }
  }
}

type TypingViewBuilder = HtmlBuilder<Message>

const gameTextCharView =
  (
    userGameText: string,
    maybeWrongCharIndex: Option.Option<number>,
    h: TypingViewBuilder,
  ) =>
  (char: string, index: number): Html => {
    const userGameTextLength = String.length(userGameText)
    const isNext =
      (userGameTextLength === 0 && index === 0) ||
      (index === userGameTextLength && Option.isNone(maybeWrongCharIndex))
    const isWrong = Option.exists(maybeWrongCharIndex, wrongIndex =>
      Order.isBetween(Number.Order)(index, {
        minimum: wrongIndex,
        maximum: Number.decrement(userGameTextLength),
      }),
    )
    const isUntyped = index >= userGameTextLength && !isNext
    const isCorrect = index < userGameTextLength && !isWrong

    return h.span(
      [
        h.Class(
          clsx({
            'text-terminal-green-dark': isUntyped,
            'text-terminal-green': isCorrect,
            'text-terminal-red bg-terminal-red/20': isWrong,
            'text-terminal-green bg-terminal-green/30': isNext,
          }),
        ),
      ],
      [isNext && char === '\n' ? '↵' : char],
    )
  }

export const TypingLive = Typing.make(
  Effect.fn(function* () {
    const client = yield* RoomsClient

    return {
      model: EMPTY_MODEL,

      update: {
        ChangedUserText: changedUserTextStep,
        InformedOfGameStart: () => ({
          model: EMPTY_MODEL,
          commands: [FocusUserGameTextInput()],
        }),
        InformedOfGameEnd: () => ({ model: EMPTY_MODEL }),
        ReceivedPlayerProgress: (model, { maybePlayerProgress }) =>
          receivedPlayerProgressStep(model, maybePlayerProgress),
        CompletedFocusUserGameTextInput: model => ({ model }),
        CompletedUpdatePlayerProgress: model => ({ model }),
      },

      commands: {
        UpdatePlayerProgress: ({
          playerId,
          gameId,
          userGameText,
          charsTyped,
        }) =>
          client
            .updatePlayerProgress({
              playerId,
              gameId,
              userText: userGameText,
              charsTyped,
            })
            .pipe(
              Effect.ignore,
              Effect.as(Message.CompletedUpdatePlayerProgress()),
            ),
        FocusUserGameTextInput: () =>
          Dom.focus(`#${USER_GAME_TEXT_INPUT_ID}`).pipe(
            Effect.ignore,
            Effect.as(Message.CompletedFocusUserGameTextInput()),
          ),
      },

      view: ({ userGameText }, h, { game, playerId }) => {
        const maybeWrongCharIndex = findFirstWrongCharIndex(userGameText)(
          game.text,
        )

        return h.div(
          [h.Class('relative')],
          [
            h.textarea([
              h.Id(USER_GAME_TEXT_INPUT_ID),
              h.Value(userGameText),
              h.Class('absolute inset-0 opacity-0 z-10 resize-none'),
              h.OnInput(value =>
                Message.ChangedUserText({ value, game, playerId }),
              ),
              h.Spellcheck(false),
              h.Autocorrect('off'),
              h.Autocapitalize('none'),
            ]),
            h.div(
              [h.Class('whitespace-pre-wrap')],
              pipe(
                game.text,
                String.split(''),
                Array.map(
                  gameTextCharView(userGameText, maybeWrongCharIndex, h),
                ),
              ),
            ),
          ],
        )
      },
    }
  }),
)
