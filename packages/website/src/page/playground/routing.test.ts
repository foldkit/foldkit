import { Option } from 'effect'
import { expect, test } from 'vitest'

import { Tabs } from '@foldkit/ui'

import { Message } from './definition'
import { init, update } from './playground'

test('routes a Tabs Message through the registered Binding', () => {
  const initial = init('counter', Option.some(true)).model
  const selectedPath = 'src/styles.css'

  const selected = update(
    initial,
    Message.GotFileTabsMessage({
      message: Tabs.Message.SelectedTab({ index: 1, value: selectedPath }),
    }),
  )

  expect(selected.model.activeFilePath).toBe(selectedPath)
})
