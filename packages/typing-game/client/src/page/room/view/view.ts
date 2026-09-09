import { Match, Option } from 'effect'
import { AsyncData, Submodel } from 'foldkit'
import { Html, HtmlBuilder } from 'foldkit/html'

import * as Shared from '@typing-game/shared'

import { ROOM_PAGE_USERNAME_INPUT_ID } from '../../../constant'
import { Icon } from '../../../view/icon'
import { Message } from '../message'
import { Model, RoomPlayerSession } from '../model'
import { findFirstWrongCharIndex } from '../userGameText'
import { countdown } from './countdown'
import { finished } from './finished'
import { getReady } from './getReady'
import { playing } from './playing'
import { waiting } from './waiting'

export type ViewInputs = Readonly<{ roomId: string }>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const { roomId } = viewInputs

    const maybeError = AsyncData.getError(model.roomAsyncData)

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
        h.OnClick(Message.ClickedCopyRoomId()),
      ],
      [Icon.copy()],
    )

    const isInLeavableState = Option.exists(
      AsyncData.getData(model.roomAsyncData),
      ({ status }) => status._tag === 'Waiting' || status._tag === 'Finished',
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
            content(model, h),
            maybeErrorMessage(maybeError, h),
          ],
        ),
        h.div([], [leaveRoomText]),
      ],
    )
  },
)

const content = (
  { roomAsyncData, maybeSession, userGameText, username }: Model,
  h: HtmlBuilder<Message>,
): Html =>
  AsyncData.matchData(roomAsyncData, {
    onEmpty: () => h.div([], ['Loading...']),
    onFailure: () => h.empty,
    onData: room =>
      Option.match(maybeSession, {
        onNone: () => joinForm(username, h),
        onSome: () => gameContent(room, maybeSession, userGameText, h),
      }),
  })

const gameContent = (
  room: Shared.Room,
  maybeSession: Option.Option<RoomPlayerSession>,
  userGameText: string,
  h: HtmlBuilder<Message>,
): Html => {
  const maybeGameText = Option.map(room.maybeGame, ({ text }) => text)
  const maybeWrongCharIndex = Option.flatMap(
    maybeGameText,
    findFirstWrongCharIndex(userGameText),
  )

  return Match.value(room.status).pipe(
    Match.tagsExhaustive({
      Waiting: () => waiting(room.players, room.hostId, maybeSession, h),
      GetReady: () => getReady(maybeGameText, h),
      Countdown: ({ secondsLeft }) => countdown(secondsLeft, maybeGameText, h),
      Playing: ({ secondsLeft }) =>
        playing(
          secondsLeft,
          maybeGameText,
          userGameText,
          maybeWrongCharIndex,
          h,
        ),
      Finished: () =>
        finished(room.maybeScoreboard, room.hostId, maybeSession, h),
    }),
  )
}

const joinForm = (username: string, h: HtmlBuilder<Message>): Html =>
  h.form(
    [h.OnSubmit(Message.SubmittedJoinRoomFromPage())],
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
                h.OnInput(value => Message.ChangedRoomPageUsername({ value })),
                h.OnBlur(Message.BlurredRoomPageUsernameInput()),
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

const maybeErrorMessage = (
  maybeRoomFormError: Option.Option<string>,
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(maybeRoomFormError, {
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
