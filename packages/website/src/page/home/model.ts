import { Schema } from 'effect'

import { AsyncCounterDemo } from './asyncCounterDemo'
import * as DemoTab from './demoTab'
import { NotePlayerDemo } from './notePlayerDemo'
import { PlaygroundMenu } from './playgroundMenu'

export const Model = Schema.Struct({
  demoTabs: DemoTab.DemoTabs,
  activeDemoTab: DemoTab.Tab,
  playgroundMenu: PlaygroundMenu,
  asyncCounterDemo: AsyncCounterDemo,
  notePlayerDemo: NotePlayerDemo,
})
export type Model = typeof Model.Type
