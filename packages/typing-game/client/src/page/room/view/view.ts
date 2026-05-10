import * as Shared from '@typing-game/shared'
import { Match as M, Option } from 'effect'
import { Mount } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { ROOM_PAGE_USERNAME_INPUT_ID } from '../../../constant'
import { RoomRoute } from '../../../route'
import { Icon } from '../../../view/icon'
import { FocusRoomPageUsernameInput } from '../command'
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
  <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
  ) =>
  ({ roomId }: RoomRoute): Html => {
    const h = html<ParentMessage>()

    const maybeError = M.value(model.roomRemoteData).pipe(
      M.tag('Error', ({ error }) => error),
      M.option,
    )

    const welcomeText = Option.match(model.maybeSession, {
      onNone: () => h.empty,
      onSome: ({ player }) =>
        h.h2([h.Class('mb-6')], [`Welcome, ${player.username}!`]),
    })

    const copiedIndicator = model.isRoomIdCopyIndicatorVisible
      ? h.div(
          [
            h.Class(
              'text-lg rounded py-1 px-2 font-medium bg-terminal-green-dim text-terminal-bg uppercase',
            ),
          ],
          ['Copied'],
        )
      : h.empty

    const copyButton = h.button(
      [
        h.Class(
          'p-2 rounded hover:bg-terminal-green-dim hover:text-terminal-bg transition text-terminal-green',
        ),
        h.AriaLabel('Copy room ID'),
        h.OnClick(toParentMessage(ClickedCopyRoomId({ roomId }))),
      ],
      [Icon.copy<ParentMessage>()],
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
      ? h.div(
          [h.Class('opacity-30')],
          [`< Backspace to leave room (${model.exitCountdownSecondsLeft})`],
        )
      : h.div([], ['< Backspace to leave room'])

    const leaveRoomText = isInLeavableState ? leaveRoomContent : h.empty

    return h.div(
      [h.Class('max-w-4xl flex-1 flex flex-col justify-between')],
      [
        h.div(
          [],
          [
            welcomeText,
            h.h3([h.Class('uppercase')], ['[Room id]']),
            h.div(
              [h.Class('mb-12 flex items-center gap-2')],
              [h.span([], [roomId]), copyButton, copiedIndicator],
            ),
            content<ParentMessage>(model, roomId, toParentMessage),
            maybeErrorMessage<ParentMessage>(maybeError),
          ],
        ),
        h.div([], [leaveRoomText]),
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

const content = <ParentMessage>(
  { roomRemoteData, maybeSession, userGameText, username }: Model,
  roomId: string,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.keyed('div')(
    contentKey(roomRemoteData, maybeSession),
    [],
    [
      M.value(roomRemoteData).pipe(
        M.tagsExhaustive({
          Idle: () => h.div([], ['Loading...']),
          Loading: () => h.div([], ['Loading...']),
          Error: () => h.empty,
          Ok: ({ data: room }) =>
            Option.match(maybeSession, {
              onNone: () =>
                joinForm<ParentMessage>(username, roomId, toParentMessage),
              onSome: () =>
                gameContent<ParentMessage>(
                  room,
                  maybeSession,
                  userGameText,
                  toParentMessage,
                ),
            }),
        }),
      ),
    ],
  )
}

const gameContent = <ParentMessage>(
  room: Shared.Room,
  maybeSession: Option.Option<RoomPlayerSession>,
  userGameText: string,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()
  const maybeGameText = Option.map(room.maybeGame, ({ text }) => text)
  const maybeWrongCharIndex = Option.flatMap(
    maybeGameText,
    findFirstWrongCharIndex(userGameText),
  )

  return h.keyed('div')(
    room.status._tag,
    [],
    [
      M.value(room.status).pipe(
        M.tagsExhaustive({
          Waiting: () =>
            waiting<ParentMessage>(room.players, room.hostId, maybeSession),
          GetReady: () => getReady<ParentMessage>(maybeGameText),
          Countdown: ({ secondsLeft }) =>
            countdown<ParentMessage>(secondsLeft, maybeGameText),
          Playing: ({ secondsLeft }) =>
            playing<ParentMessage>(
              secondsLeft,
              maybeGameText,
              userGameText,
              maybeWrongCharIndex,
              toParentMessage,
            ),
          Finished: () =>
            finished<ParentMessage>(
              room.maybeScoreboard,
              room.hostId,
              maybeSession,
            ),
        }),
      ),
    ],
  )
}

const joinForm = <ParentMessage>(
  username: string,
  roomId: string,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.form(
    [h.OnSubmit(toParentMessage(SubmittedJoinRoomFromPage({ roomId })))],
    [
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          h.label([h.For(ROOM_PAGE_USERNAME_INPUT_ID)], ['Enter username: ']),
          h.div(
            [h.Class('flex items-center gap-2 flex-1')],
            [
              // Safari ignores fields named "search" for password autofill
              h.input([
                h.Id(ROOM_PAGE_USERNAME_INPUT_ID),
                h.Name('search'),
                h.Type('text'),
                h.Value(username),
                h.Class('bg-transparent px-0 py-2 outline-none w-full'),
                h.OnInput(value =>
                  toParentMessage(ChangedRoomPageUsername({ value })),
                ),
                h.OnBlur(toParentMessage(BlurredRoomPageUsernameInput())),
                h.OnMount(
                  Mount.mapMessage(
                    FocusRoomPageUsernameInput(),
                    toParentMessage,
                  ),
                ),
                h.Autocapitalize('none'),
                h.Spellcheck(false),
                h.Autocorrect('off'),
                h.Autocomplete('off'),
                h.Maxlength(24),
              ]),
            ],
          ),
        ],
      ),
    ],
  )
}

const maybeErrorMessage = <ParentMessage>(
  maybeRoomFormError: Option.Option<string>,
) => {
  const h = html<ParentMessage>()

  return Option.match(maybeRoomFormError, {
    onNone: () => h.empty,
    onSome: errorMessage =>
      h.div(
        [h.Class('mt-6')],
        [
          h.span([h.Class('text-terminal-red uppercase')], ['[Error] ']),
          h.span([h.Class('text-terminal-red')], [errorMessage]),
        ],
      ),
  })
}
