import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { FocusTab } from './command.js'
import { TabsComposition } from './composition.js'
import { TabsBlock } from './definition.js'
import { OutMessage } from './types.js'

/** @internal Canonical Tabs implementation. */
export const update = TabsComposition.makeUpdate({
  SelectedTab: (model, { index, value }) => ({
    model: modifyFields(model, { maybeFocusedIndex: () => Option.none() }),
    commands: [FocusTab({ id: model.id, index })],
    outMessage: OutMessage.Selected({ value, index }),
  }),
  FocusedTab: (model, { index }) => ({
    model: modifyFields(model, {
      maybeFocusedIndex: () => Option.some(index),
    }),
    commands: [FocusTab({ id: model.id, index })],
  }),
  CompletedFocusTab: TabsBlock.makeNoopStep(),
})
