import { Block } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'
import { test as TabsTest } from '@foldkit/ui/tabs'

import { HomeLive } from './block'
import { DemoTabs } from './demoTab'

describe('home', () => {
  it.effect('selecting a demo tab preserves both demo Models', () => {
    const initialDemos: Array<unknown> = []

    return story(
      HomeLive,
      model(model => {
        initialDemos.push(model.asyncCounterDemo, model.notePlayerDemo)
      }),
      message(
        Block.deliver(
          DemoTabs,
          'demoTabs',
          DemoTabs.Message.SelectedTab({ index: 1, value: 'Note Player' }),
        ),
      ),
      model(model => {
        expect(model.activeDemoTab).toBe('Note Player')
        expect([model.asyncCounterDemo, model.notePlayerDemo]).toEqual(
          initialDemos,
        )
      }),
      Command.resolve(TabsTest.FocusTab, DemoTabs.Message.CompletedFocusTab()),
      message(
        Block.deliver(
          DemoTabs,
          'demoTabs',
          DemoTabs.Message.SelectedTab({ index: 0, value: 'AsyncCounter' }),
        ),
      ),
      model(model => {
        expect(model.activeDemoTab).toBe('AsyncCounter')
        expect([model.asyncCounterDemo, model.notePlayerDemo]).toEqual(
          initialDemos,
        )
      }),
      Command.resolve(TabsTest.FocusTab, DemoTabs.Message.CompletedFocusTab()),
    )
  })
})
