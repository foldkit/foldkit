import { Layer } from 'effect'

import { Menu, Tabs } from '@foldkit/ui'

import * as AsyncCounterDemo from './asyncCounterDemo'
import * as NotePlayerDemo from './notePlayerDemo'

export const EffectsLayer = Layer.mergeAll(
  Menu.EffectsLayer,
  Tabs.EffectsLayer,
  AsyncCounterDemo.EffectsLayer,
  NotePlayerDemo.EffectsLayer,
)

export const mounts = Menu.mounts
