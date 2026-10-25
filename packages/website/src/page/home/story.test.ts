import { Command, given, message, model, story } from 'foldkit/story'
import { toParentMessage } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import { test as TabsTest } from '@foldkit/ui/tabs'

import { DemoTabsBinding } from './composition'
import { DemoTabsBlock } from './demoTab'
import { init } from './init'
import { update } from './update'
describe('home', () => {
  test('selecting a demo tab preserves both demo Models', () => {
    const initialModel = init().model
    story(
      update,
      given(initialModel),
      message(
        toParentMessage(
          DemoTabsBinding,
          DemoTabsBlock.Message.SelectedTab({
            index: 1,
            value: 'Note Player',
          }),
        ),
      ),
      model(model => {
        expect(model.activeDemoTab).toBe('Note Player')
        expect(model.asyncCounterDemo).toBe(initialModel.asyncCounterDemo)
        expect(model.notePlayerDemo).toBe(initialModel.notePlayerDemo)
      }),
      Command.resolve(
        TabsTest.FocusTab,
        DemoTabsBlock.Message.CompletedFocusTab(),
      ),
      message(
        toParentMessage(
          DemoTabsBinding,
          DemoTabsBlock.Message.SelectedTab({
            index: 0,
            value: 'AsyncCounter',
          }),
        ),
      ),
      model(model => {
        expect(model.activeDemoTab).toBe('AsyncCounter')
        expect(model.asyncCounterDemo).toBe(initialModel.asyncCounterDemo)
        expect(model.notePlayerDemo).toBe(initialModel.notePlayerDemo)
      }),
      Command.resolve(
        TabsTest.FocusTab,
        DemoTabsBlock.Message.CompletedFocusTab(),
      ),
    )
  })
})
