import { Command, init, messageFrom, models, steps, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { Tabs } from '@foldkit/ui'

import { DemoTabsBinding } from './composition'
import { DemoTabsBlock } from './demoTab'
import { HomeBlock, layer } from './index'

const homeSubject = { block: HomeBlock, layer }

describe('home', () => {
  it.effect('selecting a demo tab preserves both demo Models', () =>
    story(
      homeSubject,
      init(),
      models(
        steps(
          messageFrom(
            DemoTabsBinding,
            DemoTabsBlock.Message.SelectedTab({
              index: 1,
              value: 'Note Player',
            }),
          ),
          Command.resolve(
            Tabs.test.FocusTab,
            DemoTabsBlock.Message.CompletedFocusTab(),
          ),
        ),
        (before, after) => {
          expect(after.activeDemoTab).toBe('Note Player')
          expect(after.asyncCounterDemo).toBe(before.asyncCounterDemo)
          expect(after.notePlayerDemo).toBe(before.notePlayerDemo)
        },
      ),
      models(
        steps(
          messageFrom(
            DemoTabsBinding,
            DemoTabsBlock.Message.SelectedTab({
              index: 0,
              value: 'AsyncCounter',
            }),
          ),
          Command.resolve(
            Tabs.test.FocusTab,
            DemoTabsBlock.Message.CompletedFocusTab(),
          ),
        ),
        (before, after) => {
          expect(after.activeDemoTab).toBe('AsyncCounter')
          expect(after.asyncCounterDemo).toBe(before.asyncCounterDemo)
          expect(after.notePlayerDemo).toBe(before.notePlayerDemo)
        },
      ),
    ),
  )
})
