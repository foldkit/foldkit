import { Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Message } from '../../message'
import type { Model as AppModel } from '../../model'
import type { User } from '../user'
import { PersistSettings, Message as SettingsMessage } from './message'
import type { Model as SettingsModel } from './model'

type Context = Readonly<{
  currentUser: User
}>

type UpdateReturn = Update.Return<SettingsModel, SettingsMessage>

export const update = (
  model: SettingsModel,
  message: SettingsMessage,
  context: Context,
) =>
  SettingsMessage.match<UpdateReturn>(message, {
    ChangedTheme: ({ theme }) => ({
      model: evo(model, { theme: () => theme }),
      commands: [PersistSettings({ userId: context.currentUser.id, theme })],
    }),
    // ...other arms
  })

// PARENT UPDATE

const foldSettings = (currentUser: User) =>
  Update.foldChild({
    update: (settings: SettingsModel, message: SettingsMessage) =>
      update(settings, message, { currentUser }),
    read: (model: AppModel) => Option.some(model.settings),
    write: (model, nextSettings) =>
      evo(model, { settings: () => nextSettings }),
    toParentMessage: message => Message.GotSettingsMessage({ message }),
  })

GotSettingsMessage: ({ message }) =>
  foldSettings(model.currentUser)(model, message)
