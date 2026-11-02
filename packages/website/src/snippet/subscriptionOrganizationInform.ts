import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Room } from './subscriptionOrganizationRoom'

export class Lobby extends Block<Lobby>()('Lobby', {
  Model: Schema.Struct({ room: Room, isHelpOpen: Schema.Boolean }),
  Message: defineMessageUnion({ ClickedHelp: {}, ClickedCloseHelp: {} }),
}) {}

export const LobbyLive = Lobby.toLayer(() => ({
  init: () => ({
    room: new Room('room', { roomId: 'general' }),
    isHelpOpen: false,
  }),

  update: {
    ClickedHelp: model => ({
      model: modifyFields(model, { isHelpOpen: () => true }),
      messages: [
        model.room.send(
          Room.Message.InformedOfDialogChange({ isDialogOpen: true }),
        ),
      ],
    }),
    ClickedCloseHelp: model => ({
      model: modifyFields(model, { isHelpOpen: () => false }),
      messages: [
        model.room.send(
          Room.Message.InformedOfDialogChange({ isDialogOpen: false }),
        ),
      ],
    }),
  },
}))
