import { clsx } from 'clsx'
import { Array, Number, Option, Order, String as Str, pipe } from 'effect'
import { Html, html } from 'foldkit/html'

import { USER_GAME_TEXT_INPUT_ID } from '../../../constant'
import { ChangedUserText } from '../message'
import type { Message } from '../message'

const typing = (
  gameText: string,
  userGameText: string,
  maybeWrongCharIndex: Option.Option<number>,
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('relative')],
    [
      h.textarea(
        [
          h.Id(USER_GAME_TEXT_INPUT_ID),
          h.Value(userGameText),
          h.Class('absolute inset-0 opacity-0 z-10 resize-none'),
          h.OnInput(value => ChangedUserText({ value })),
          h.Spellcheck(false),
          h.Autocorrect('off'),
          h.Autocapitalize('none'),
        ],
        [],
      ),
      gameTextWithProgress(gameText, userGameText, maybeWrongCharIndex),
    ],
  )
}

const gameTextWithProgress = (
  gameText: string,
  userGameText: string,
  maybeWrongCharIndex: Option.Option<number>,
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('whitespace-pre-wrap')],
    pipe(
      gameText,
      Str.split(''),
      Array.map(char(userGameText, maybeWrongCharIndex)),
    ),
  )
}

const char =
  (userGameText: string, maybeWrongCharIndex: Option.Option<number>) =>
  (char: string, index: number): Html => {
    const h = html<Message>()
    const userGameTextLength = Str.length(userGameText)
    const hasNoInput = userGameTextLength === 0
    const isNext =
      (hasNoInput && index === 0) ||
      (index === userGameTextLength && Option.isNone(maybeWrongCharIndex))

    const isWrong = Option.exists(maybeWrongCharIndex, wrongIndex =>
      Order.isBetween(Number.Order)(index, {
        minimum: wrongIndex,
        maximum: Number.decrement(userGameTextLength),
      }),
    )

    const isUntyped = index >= userGameTextLength && !isNext
    const isCorrect = index < userGameTextLength && !isWrong

    const isNextNewline = isNext && char === '\n'

    const charClassName = clsx({
      'text-terminal-green-dark': isUntyped,
      'text-terminal-green': isCorrect,
      'text-terminal-red bg-terminal-red/20': isWrong,
      'text-terminal-green bg-terminal-green/30': isNext,
    })

    const displayChar = isNextNewline ? '↵' : char

    return h.span([h.Class(charClassName)], [displayChar])
  }

export const playing = (
  secondsLeft: number,
  maybeGameText: Option.Option<string>,
  userGameText: string,
  maybeWrongCharIndex: Option.Option<number>,
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('space-y-6')],
    [
      h.h3(
        [h.Class('uppercase')],
        [
          `[Time remaining] ${secondsLeft} ${secondsLeft === 1 ? 'second' : 'seconds'}`,
        ],
      ),
      Option.match(maybeGameText, {
        onNone: () => h.empty,
        onSome: gameText => typing(gameText, userGameText, maybeWrongCharIndex),
      }),
    ],
  )
}
