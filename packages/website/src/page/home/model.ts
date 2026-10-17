import { Schema } from 'effect'

import * as AsyncCounterDemo from './asyncCounterDemo'
import * as DemoTab from './demoTab'
import * as NotePlayerDemo from './notePlayerDemo'
import { PlaygroundMenu } from './playgroundMenu'

export const Model = Schema.Struct({
  demoTabs: DemoTab.DemoTabs.Model,
  activeDemoTab: DemoTab.Tab,
  playgroundMenu: PlaygroundMenu.Model,
  asyncCounterDemo: AsyncCounterDemo.Model,
  notePlayerDemo: NotePlayerDemo.Model,
})
export type Model = typeof Model.Type
