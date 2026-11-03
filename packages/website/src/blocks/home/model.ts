import { Schema } from 'effect'

import { AsyncCounterDemo, NotePlayerDemo } from './blocks'
import * as DemoTab from './demoTab'
import { PlaygroundMenuBlock } from './playgroundMenu'

export const Model = Schema.Struct({
  demoTabs: DemoTab.DemoTabsBlock.Model,
  activeDemoTab: DemoTab.Tab,
  playgroundMenu: PlaygroundMenuBlock.Model,
  asyncCounterDemo: AsyncCounterDemo.AsyncCounterDemoBlock.Model,
  notePlayerDemo: NotePlayerDemo.NotePlayerDemoBlock.Model,
})
export type Model = typeof Model.Type
