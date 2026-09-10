// subscription.ts
import { Subscription } from 'foldkit'

import { GotSettingsMessage, type Message } from './message'
import type { Model } from './model'
import * as Settings from './settings'

const settingsSubscriptions = Subscription.lift(Settings.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.settings,
  toParentMessage: message => GotSettingsMessage({ message }),
  when: ({ route }) => route._tag === 'Settings',
})

export const subscriptions = Subscription.aggregate<Model, Message>()(
  settingsSubscriptions,
)
