import { Array, Effect, Schema, String } from 'effect'
import { Block, Command, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { RoomsClient } from '../../services'

const USERNAME_INPUT_ID = 'roomPageUsername'
const USERNAME_MAX_LENGTH = 24

const Model = Schema.Struct({
  username: Schema.String,
})

const Message = defineMessageUnion({
  RequestedFocus: {},
  ChangedUsername: { value: Schema.String },
  BlurredUsernameInput: {},
  SubmittedForm: {},
  CompletedFocusRoomPageUsernameInput: {},
  SucceededJoinRoom: { player: Shared.Player },
  FailedJoinRoom: {},
})

const OutMessage = defineMessageUnion({
  JoinedRoom: { player: Shared.Player },
})

export const JoinRoom = Command.define('JoinRoom', {
  args: { username: Schema.String, roomId: Schema.String },
  messages: [Message.SucceededJoinRoom, Message.FailedJoinRoom],
})

export const FocusRoomPageUsernameInput = Command.define(
  'FocusRoomPageUsernameInput',
  { messages: [Message.CompletedFocusRoomPageUsernameInput] },
)

export type JoinFormArgs = Readonly<{ roomId: string }>

export class JoinForm extends Block<JoinForm, JoinFormArgs>()('JoinForm', {
  Model,
  Message,
  OutMessage,
  Command: [JoinRoom, FocusRoomPageUsernameInput],
}) {}

export const JoinFormLive = JoinForm.make(
  Effect.fn(function* (_id, { roomId }) {
    const client = yield* RoomsClient

    return {
      model: { username: '' },

      update: {
        RequestedFocus: model => ({
          model,
          commands: [FocusRoomPageUsernameInput()],
        }),
        ChangedUsername: (model, { value }) => ({
          model: modifyFields(model, { username: () => value }),
        }),
        BlurredUsernameInput: model => ({
          model,
          commands: [FocusRoomPageUsernameInput()],
        }),
        SubmittedForm: model => ({
          model,
          commands: Array.filter(
            [JoinRoom({ username: model.username, roomId })],
            () => String.isNonEmpty(model.username),
          ),
        }),
        CompletedFocusRoomPageUsernameInput: model => ({ model }),
        SucceededJoinRoom: (model, { player }) => ({
          model,
          outMessage: OutMessage.JoinedRoom({ player }),
        }),
        FailedJoinRoom: model => ({ model }),
      },

      commands: {
        JoinRoom: ({ username, roomId }) =>
          client.joinRoom({ username, roomId }).pipe(
            Effect.map(({ player }) => Message.SucceededJoinRoom({ player })),
            Effect.catch(() => Effect.succeed(Message.FailedJoinRoom())),
          ),
        FocusRoomPageUsernameInput: () =>
          Dom.focus(`#${USERNAME_INPUT_ID}`).pipe(
            Effect.ignore,
            Effect.as(Message.CompletedFocusRoomPageUsernameInput()),
          ),
      },

      view: (model, h) =>
        h.form(
          [h.OnSubmit(Message.SubmittedForm())],
          [
            h.div(
              [h.Class('flex items-center gap-2')],
              [
                h.label([h.For(USERNAME_INPUT_ID)], ['Enter username: ']),
                h.div(
                  [h.Class('flex items-center gap-2 flex-1')],
                  [
                    // NOTE: Safari ignores fields named "search" for password autofill.
                    h.input([
                      h.Id(USERNAME_INPUT_ID),
                      h.Name('search'),
                      h.Type('text'),
                      h.Value(model.username),
                      h.Class('bg-transparent px-0 py-2 outline-none w-full'),
                      h.OnInput(value => Message.ChangedUsername({ value })),
                      h.OnBlur(Message.BlurredUsernameInput()),
                      h.Autocapitalize('none'),
                      h.Spellcheck(false),
                      h.Autocorrect('off'),
                      h.Autocomplete('off'),
                      h.Maxlength(USERNAME_MAX_LENGTH),
                    ]),
                  ],
                ),
              ],
            ),
          ],
        ),
    }
  }),
)
