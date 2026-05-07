import * as Shared from '@typing-game/shared'
import { Match as M, Option } from 'effect'
import { Mount } from 'foldkit'
import { Html } from 'foldkit/html'

import { ROOM_PAGE_USERNAME_INPUT_ID } from '../../../constant'
import type { Message as ParentMessage } from '../../../message'
import { RoomRoute } from '../../../route'
import {
  AriaLabel,
  Autocapitalize,
  Autocomplete,
  Autocorrect,
  Class,
  For,
  Id,
  Maxlength,
  Name,
  OnBlur,
  OnClick,
  OnInput,
  OnMount,
  OnSubmit,
  Spellcheck,
  Type,
  Value,
  button,
  div,
  empty,
  form,
  h2,
  h3,
  input,
  keyed,
  label,
  span,
} from '../../../view/html'
import { Icon } from '../../../view/icon'
import { focusRoomPageUsernameInput } from '../command'
import {
  BlurredRoomPageUsernameInput,
  ChangedRoomPageUsername,
  ClickedCopyRoomId,
  SubmittedJoinRoomFromPage,
} from '../message'
import type { Message } from '../message'
import { Model, RoomPlayerSession } from '../model'
import { findFirstWrongCharIndex } from '../userGameText'
import { countdown } from './countdown'
import { finished } from './finished'
import { getReady } from './getReady'
import { playing } from './playing'
import { waiting } from './waiting'

export const view =
  (model: Model, toParentMessage: (message: Message) => ParentMessage) =>
  ({ roomId }: RoomRoute): Html => {
    const maybeError = M.value(model.roomRemoteData).pipe(
      M.tag('Error', ({ error }) => error),
      M.option,
    )

    const welcomeText = Option.match(model.maybeSession, {
      onNone: () => empty,
      onSome: ({ player }) =>
        h2([Class('mb-6')], [`Welcome, ${player.username}!`]),
    })

    const copiedIndicator = model.isRoomIdCopyIndicatorVisible
      ? div(
          [
            Class(
              'text-lg rounded py-1 px-2 font-medium bg-terminal-green-dim text-terminal-bg uppercase',
            ),
          ],
          ['Copied'],
        )
      : empty

    const copyButton = button(
      [
        Class(
          'p-2 rounded hover:bg-terminal-green-dim hover:text-terminal-bg transition text-terminal-green',
        ),
        AriaLabel('Copy room ID'),
        OnClick(toParentMessage(ClickedCopyRoomId({ roomId }))),
      ],
      [Icon.copy()],
    )

    const isInLeavableState = M.value(model.roomRemoteData).pipe(
      M.tag(
        'Ok',
        ({ data }) =>
          data.status._tag === 'Waiting' || data.status._tag === 'Finished',
      ),
      M.orElse(() => false),
    )

    const isExitCountingDown = model.exitCountdownSecondsLeft > 0

    const leaveRoomContent = isExitCountingDown
      ? div(
          [Class('opacity-30')],
          [`< Backspace to leave room (${model.exitCountdownSecondsLeft})`],
        )
      : div([], ['< Backspace to leave room'])

    const leaveRoomText = isInLeavableState ? leaveRoomContent : empty

    return div(
      [Class('max-w-4xl flex-1 flex flex-col justify-between')],
      [
        div(
          [],
          [
            welcomeText,
            h3([Class('uppercase')], ['[Room id]']),
            div(
              [Class('mb-12 flex items-center gap-2')],
              [span([], [roomId]), copyButton, copiedIndicator],
            ),
            content(model, roomId, toParentMessage),
            maybeErrorMessage(maybeError),
          ],
        ),
        div([], [leaveRoomText]),
      ],
    )
  }

const contentKey = (
  roomRemoteData: Model['roomRemoteData'],
  maybeSession: Option.Option<RoomPlayerSession>,
): string =>
  M.value(roomRemoteData).pipe(
    M.tag('Ok', () => (Option.isSome(maybeSession) ? 'game' : 'join')),
    M.orElse(({ _tag }) => _tag.toLowerCase()),
  )

const content = (
  { roomRemoteData, maybeSession, userGameText, username }: Model,
  roomId: string,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  keyed('div')(
    contentKey(roomRemoteData, maybeSession),
    [],
    [
      M.value(roomRemoteData).pipe(
        M.tagsExhaustive({
          Idle: () => div([], ['Loading...']),
          Loading: () => div([], ['Loading...']),
          Error: () => empty,
          Ok: ({ data: room }) =>
            Option.match(maybeSession, {
              onNone: () => joinForm(username, roomId, toParentMessage),
              onSome: () =>
                gameContent(room, maybeSession, userGameText, toParentMessage),
            }),
        }),
      ),
    ],
  )

const gameContent = (
  room: Shared.Room,
  maybeSession: Option.Option<RoomPlayerSession>,
  userGameText: string,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const maybeGameText = Option.map(room.maybeGame, ({ text }) => text)
  const maybeWrongCharIndex = Option.flatMap(
    maybeGameText,
    findFirstWrongCharIndex(userGameText),
  )

  return keyed('div')(
    room.status._tag,
    [],
    [
      M.value(room.status).pipe(
        M.tagsExhaustive({
          Waiting: () => waiting(room.players, room.hostId, maybeSession),
          GetReady: () => getReady(maybeGameText),
          Countdown: ({ secondsLeft }) => countdown(secondsLeft, maybeGameText),
          Playing: ({ secondsLeft }) =>
            playing(
              secondsLeft,
              maybeGameText,
              userGameText,
              maybeWrongCharIndex,
              toParentMessage,
            ),
          Finished: () =>
            finished(room.maybeScoreboard, room.hostId, maybeSession),
        }),
      ),
    ],
  )
}

const joinForm = (
  username: string,
  roomId: string,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  form(
    [OnSubmit(toParentMessage(SubmittedJoinRoomFromPage({ roomId })))],
    [
      div(
        [Class('flex items-center gap-2')],
        [
          label([For(ROOM_PAGE_USERNAME_INPUT_ID)], ['Enter username: ']),
          div(
            [Class('flex items-center gap-2 flex-1')],
            [
              // Safari ignores fields named "search" for password autofill
              input([
                Id(ROOM_PAGE_USERNAME_INPUT_ID),
                Name('search'),
                Type('text'),
                Value(username),
                Class('bg-transparent px-0 py-2 outline-none w-full'),
                OnInput(value =>
                  toParentMessage(ChangedRoomPageUsername({ value })),
                ),
                OnBlur(toParentMessage(BlurredRoomPageUsernameInput())),
                OnMount(
                  Mount.mapMessage(focusRoomPageUsernameInput, toParentMessage),
                ),
                Autocapitalize('none'),
                Spellcheck(false),
                Autocorrect('off'),
                Autocomplete('off'),
                Maxlength(24),
              ]),
            ],
          ),
        ],
      ),
    ],
  )

const maybeErrorMessage = (maybeRoomFormError: Option.Option<string>) =>
  Option.match(maybeRoomFormError, {
    onNone: () => empty,
    onSome: errorMessage =>
      div(
        [Class('mt-6')],
        [
          span([Class('text-terminal-red uppercase')], ['[Error] ']),
          span([Class('text-terminal-red')], [errorMessage]),
        ],
      ),
  })
