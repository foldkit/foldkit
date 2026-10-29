import { Schema } from 'effect'

import * as AsyncCounterDemo from './asyncCounterDemo'
import * as DemoTab from './demoTab'
import * as NotePlayerDemo from './notePlayerDemo'
import { PlaygroundMenuBlock } from './playgroundMenu'

export const Model = Schema.Struct({
  demoTabs: DemoTab.DemoTabsBlock.Model,
  activeDemoTab: DemoTab.Tab,
  playgroundMenu: PlaygroundMenuBlock.Model,
  asyncCounterDemo: AsyncCounterDemo.AsyncCounterDemoBlock.Model,
  notePlayerDemo: NotePlayerDemo.NotePlayerDemoBlock.Model,
})
export type Model = typeof Model.Type
