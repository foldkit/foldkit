import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { FocusTab } from './command.js'
import type { MessageSchema, Model, OutMessageSchema } from './types.js'

/** @internal Selection handlers preserve the exact value and focus Command. */
export const makeUpdateHandlers = <Value extends string, ValueEncoded>(
  Message: MessageSchema<Value, ValueEncoded>,
  OutMessage: OutMessageSchema<Value, ValueEncoded>,
) => ({
  SelectedTab: (
    model: Model,
    { index, value }: typeof Message.SelectedTab.Type,
  ) => ({
    model: modifyFields(model, { maybeFocusedIndex: () => Option.none() }),
    commands: [FocusTab({ id: model.id, index })],
    outMessage: OutMessage.Selected({ value, index }),
  }),
  FocusedTab: (model: Model, { index }: typeof Message.FocusedTab.Type) => ({
    model: modifyFields(model, {
      maybeFocusedIndex: () => Option.some(index),
    }),
    commands: [FocusTab({ id: model.id, index })],
  }),
  CompletedFocusTab: (model: Model) => ({ model }),
})
