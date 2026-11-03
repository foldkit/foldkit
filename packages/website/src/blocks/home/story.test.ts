import { Effect } from 'effect'
import { Command, init, messageFrom, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { test as TabsTest } from '@foldkit/ui/tabs'

import { HomeBlock, layer } from './block'
import { DemoTabsBinding } from './composition'
import { DemoTabsBlock } from './demoTab'

describe('home', () => {
  it.effect('selecting a demo tab preserves both demo Models', () => {
    let initialAsyncCounterDemo:
      | typeof HomeBlock.Model.Type.asyncCounterDemo
      | undefined
    let initialNotePlayerDemo:
      | typeof HomeBlock.Model.Type.notePlayerDemo
      | undefined

    return story(
      HomeBlock,
      init(),
      model(model => {
        initialAsyncCounterDemo = model.asyncCounterDemo
        initialNotePlayerDemo = model.notePlayerDemo
      }),
      messageFrom(
        DemoTabsBinding,
        DemoTabsBlock.Message.SelectedTab({
          index: 1,
          value: 'Note Player',
        }),
      ),
      model(model => {
        expect(model.activeDemoTab).toBe('Note Player')
        expect(model.asyncCounterDemo).toBe(initialAsyncCounterDemo)
        expect(model.notePlayerDemo).toBe(initialNotePlayerDemo)
      }),
      Command.resolve(
        TabsTest.FocusTab,
        DemoTabsBlock.Message.CompletedFocusTab(),
      ),
      messageFrom(
        DemoTabsBinding,
        DemoTabsBlock.Message.SelectedTab({
          index: 0,
          value: 'AsyncCounter',
        }),
      ),
      model(model => {
        expect(model.activeDemoTab).toBe('AsyncCounter')
        expect(model.asyncCounterDemo).toBe(initialAsyncCounterDemo)
        expect(model.notePlayerDemo).toBe(initialNotePlayerDemo)
      }),
      Command.resolve(
        TabsTest.FocusTab,
        DemoTabsBlock.Message.CompletedFocusTab(),
      ),
    ).pipe(Effect.provide(layer))
  })
})
