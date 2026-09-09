import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Tabs } from '@foldkit/ui'

import { init } from './init'
import { Message } from './message'
import { update } from './update'

describe('home', () => {
  test('selecting a demo tab preserves both demo Models', () => {
    const initialModel = init().model

    story(
      update,
      given(initialModel),
      message(
        Message.GotDemoTabsMessage({
          message: Tabs.Message.SelectedTab({
            index: 1,
            value: 'Note Player',
          }),
        }),
      ),
      model(model => {
        expect(model.activeDemoTab).toBe('Note Player')
        expect(model.asyncCounterDemo).toBe(initialModel.asyncCounterDemo)
        expect(model.notePlayerDemo).toBe(initialModel.notePlayerDemo)
      }),
      Command.resolve(Tabs.FocusTab, Tabs.Message.CompletedFocusTab()),
      message(
        Message.GotDemoTabsMessage({
          message: Tabs.Message.SelectedTab({
            index: 0,
            value: 'Architecture',
          }),
        }),
      ),
      model(model => {
        expect(model.activeDemoTab).toBe('Architecture')
        expect(model.asyncCounterDemo).toBe(initialModel.asyncCounterDemo)
        expect(model.notePlayerDemo).toBe(initialModel.notePlayerDemo)
      }),
      Command.resolve(Tabs.FocusTab, Tabs.Message.CompletedFocusTab()),
    )
  })
})
