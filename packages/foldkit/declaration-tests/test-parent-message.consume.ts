import { toParentMessage } from 'foldkit/test'

import {
  AccessorBinding,
  type AccessorParentMessage,
  CounterMessage,
  KeyedFieldBinding,
  type KeyedParentMessage,
  NestedChildBinding,
  NestedChildMessage,
  NestedParentBinding,
  type NestedRootMessage,
  NumericBinding,
  PolicyBinding,
  PolicyChildMessage,
  type PolicyParentMessage,
  type RefinedPayloadParentMessage,
} from './test-parent-message.accepted.js'

export const accessorParentMessage: AccessorParentMessage = toParentMessage(
  AccessorBinding,
  CounterMessage.ClickedIncrement(),
)

export const refinedPayloadParentMessage: RefinedPayloadParentMessage =
  toParentMessage(AccessorBinding, CounterMessage.RequestedAdd({ amount: 2 }))

export const keyedParentMessage: KeyedParentMessage = toParentMessage(
  KeyedFieldBinding,
  'relocated',
  CounterMessage.ClickedIncrement(),
)

export const numericParentMessage = toParentMessage(
  NumericBinding,
  2,
  CounterMessage.ClickedIncrement(),
)

export const policyParentMessage: PolicyParentMessage = toParentMessage(
  PolicyBinding,
  PolicyChildMessage.RequestedIncrement(),
)

const nestedParentMessage = toParentMessage(
  NestedChildBinding,
  NestedChildMessage.ChangedValue(),
)
export const nestedRootMessage: NestedRootMessage = toParentMessage(
  NestedParentBinding,
  nestedParentMessage,
)
