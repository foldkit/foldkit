// ✅ Declare the parent input and handle it inside the child.
import { Schema } from 'effect'
import { Block } from 'foldkit'

import { InMessage } from './settings/inMessage'
import { Message, OutMessage } from './settings/message'
import { Model } from './settings/model'

export const SettingsKey = Symbol('Settings')
export const SettingsBlock = Block.make('Settings', {
  key: SettingsKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([]),
  inMessageOutputs: {
    RequestedThemeChange: { outMessage: OutMessage.ChangedTheme },
  },
})

const update = ParentComposition.makeUpdate({
  ClickedResetSettings: SettingsBinding.requestThemeChange({ theme: 'Light' }),
})
