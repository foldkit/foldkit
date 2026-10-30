// Stable before: the parent wraps child Messages and folds them by hand.
import { Option, Schema } from 'effect'
import { Submodel, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Settings from './settings'

export const Model = Schema.Struct({
  settings: Settings.Model,
  previewTheme: Settings.Theme,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedResetSettings: {},
  GotSettingsMessage: { message: Settings.Message },
})
export type Message = typeof Message.Type

const foldSettings = Update.foldChild({
  update: Settings.update,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) =>
    modifyFields(model, { settings: () => nextSettings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
  foldOutMessage: Settings.OutMessage.match<Update.Step<Model, Message>>({
    ChangedTheme:
      ({ theme }) =>
      model => ({ model: modifyFields(model, { previewTheme: () => theme }) }),
  }),
})

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedResetSettings: () => ({
      model: modifyFields(model, {
        settings: () => Settings.reset(model.settings),
      }),
    }),
    GotSettingsMessage: ({ message }) => foldSettings(model, message),
  })

export const view = Submodel.defineView<Model, Message>((model, h) =>
  h.submodel({
    slotId: 'settings',
    model: model.settings,
    view: Settings.view,
    toParentMessage: message => Message.GotSettingsMessage({ message }),
  }),
)
