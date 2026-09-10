import { type Update } from 'foldkit'

import { Menu, Tabs } from '@foldkit/ui'

import * as AsyncCounterDemo from './asyncCounterDemo'
import * as DemoTab from './demoTab'
import { type Message } from './message'
import { type Model } from './model'
import * as NotePlayerDemo from './notePlayerDemo'

// INIT

export const init = (): Update.Return<Model, Message> => {
  const activeDemoTab: DemoTab.Tab = 'Architecture'
  const asyncCounterDemoInit = AsyncCounterDemo.init()
  const notePlayerDemoInit = NotePlayerDemo.init()

  return {
    model: {
      aiHeadingToggleCount: 0,
      demoTabs: Tabs.init({ id: 'demo-tabs' }),
      activeDemoTab,
      playgroundMenu: Menu.init({
        id: 'playground-menu',
        isAnimated: true,
      }),
      asyncCounterDemo: asyncCounterDemoInit.model,
      notePlayerDemo: notePlayerDemoInit.model,
    },
  }
}
