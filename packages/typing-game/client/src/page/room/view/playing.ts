import classNames from 'classnames'
import { Array, Number, Option, Order, String as Str, pipe } from 'effect'
import { Html } from 'foldkit/html'

import { USER_GAME_TEXT_INPUT_ID } from '../../../constant'
import type { Message as ParentMessage } from '../../../message'
import {
  Autocapitalize,
  Autocorrect,
  Class,
  Id,
  OnInput,
  Spellcheck,
  Value,
  div,
  empty,
  h3,
  span,
  textarea,
} from '../../../view/html'
import { ChangedUserText } from '../message'
import type { Message } from '../message'

const typing = (
  gameText: string,
  userGameText: string,
  maybeWrongCharIndex: Option.Option<number>,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [Class('relative')],
    [
      textarea(
        [
          Id(USER_GAME_TEXT_INPUT_ID),
          Value(userGameText),
          Class('absolute inset-0 opacity-0 z-10 resize-none'),
          OnInput(value => toMessage(ChangedUserText({ value }))),
          Spellcheck(false),
          Autocorrect('off'),
          Autocapitalize('none'),
        ],
        [],
      ),
      gameTextWithProgress(gameText, userGameText, maybeWrongCharIndex),
    ],
  )

const gameTextWithProgress = (
  gameText: string,
  userGameText: string,
  maybeWrongCharIndex: Option.Option<number>,
): Html =>
  div(
    [Class('whitespace-pre-wrap')],
    pipe(
      gameText,
      Str.split(''),
      Array.map(char(userGameText, maybeWrongCharIndex)),
    ),
  )

const char =
  (userGameText: string, maybeWrongCharIndex: Option.Option<number>) =>
  (char: string, index: number): Html => {
    const userGameTextLength = Str.length(userGameText)
    const hasNoInput = userGameTextLength === 0
    const isNext =
      (hasNoInput && index === 0) ||
      (index === userGameTextLength && Option.isNone(maybeWrongCharIndex))

    const isWrong = Option.exists(maybeWrongCharIndex, wrongIndex =>
      Order.between(Number.Order)(index, {
        minimum: wrongIndex,
        maximum: Number.decrement(userGameTextLength),
      }),
    )

    const isUntyped = index >= userGameTextLength && !isNext
    const isCorrect = index < userGameTextLength && !isWrong

    const isNextNewline = isNext && char === '\n'

    const charClassName = classNames({
      'text-terminal-green-dark': isUntyped,
      'text-terminal-green': isCorrect,
      'text-terminal-red bg-terminal-red/20': isWrong,
      'text-terminal-green bg-terminal-green/30': isNext,
    })

    const displayChar = isNextNewline ? '↵' : char

    return span([Class(charClassName)], [displayChar])
  }

export const playing = (
  secondsLeft: number,
  maybeGameText: Option.Option<string>,
  userGameText: string,
  maybeWrongCharIndex: Option.Option<number>,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [Class('space-y-6')],
    [
      h3(
        [Class('uppercase')],
        [
          `[Time remaining] ${secondsLeft} ${secondsLeft === 1 ? 'second' : 'seconds'}`,
        ],
      ),
      Option.match(maybeGameText, {
        onNone: () => empty,
        onSome: gameText =>
          typing(gameText, userGameText, maybeWrongCharIndex, toMessage),
      }),
    ],
  )
