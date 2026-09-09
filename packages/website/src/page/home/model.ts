import { Schema } from 'effect'

import { Menu, Tabs } from '@foldkit/ui'

import * as AsyncCounterDemo from './asyncCounterDemo'
import * as DemoTab from './demoTab'
import * as NotePlayerDemo from './notePlayerDemo'

// MODEL

export const Model = Schema.Struct({
  aiHeadingToggleCount: Schema.Number,
  demoTabs: Tabs.Model,
  activeDemoTab: DemoTab.Tab,
  playgroundMenu: Menu.Model,
  asyncCounterDemo: AsyncCounterDemo.Model,
  notePlayerDemo: NotePlayerDemo.Model,
})
export type Model = typeof Model.Type
