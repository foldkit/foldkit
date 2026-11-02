import { Effect } from 'effect'
import { type TestBlock, withBlock } from 'foldkit/story'
import { Command, given, message, model, story } from 'foldkit/story'
import { toParentMessageFor } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import { test as TabsTest } from '@foldkit/ui/tabs'

import { HomeBlock, layer } from './block'
import { DemoTabsBinding } from './composition'
import { DemoTabsBlock } from './demoTab'

const makeFixture = (block: TestBlock<typeof HomeBlock>) => {
  const init = block.init
  const update = block.update
  const toParentMessage = toParentMessageFor(block)

  return { block, init, update, toParentMessage }
}

describe('home', () => {
  test('selecting a demo tab preserves both demo Models', async () => {
    await Effect.runPromise(
      withBlock(HomeBlock, executable => {
        const { init, update, toParentMessage } = makeFixture(executable)

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
      }).pipe(Effect.provide(layer)),
    )
  })
})
