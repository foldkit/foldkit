import { Menu, Tabs } from '@foldkit/ui'

import * as AsyncCounterDemo from './asyncCounterDemo'
import * as DemoTab from './demoTab'
import { Model } from './model'
import * as NotePlayerDemo from './notePlayerDemo'

// INIT

export const init = () => {
  const activeDemoTab: DemoTab.Tab = 'Architecture'
  const asyncCounterDemoInit = AsyncCounterDemo.init()
  const notePlayerDemoInit = NotePlayerDemo.init()

  return {
    model: Model.make({
      aiHeadingToggleCount: 0,
      demoTabs: Tabs.init({ id: 'demo-tabs' }),
      activeDemoTab,
      playgroundMenu: Menu.init({
        id: 'playground-menu',
        isAnimated: true,
      }),
      asyncCounterDemo: asyncCounterDemoInit.model,
      notePlayerDemo: notePlayerDemoInit.model,
    }),
  }
}
