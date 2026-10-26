import type * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { toParentMessage } from 'foldkit/test'

import {
  AccessorBinding,
  CounterMessage,
  KeyedFieldBinding,
  LiteralBinding,
  MessageFreeBinding,
  NestedChildBinding,
  NestedChildMessage,
  NumericBinding,
  PolicyChildMessage,
  PrimaryChoiceBinding,
  SecondaryChoice,
  nestedChildParentMessage,
} from './test-parent-message.accepted.js'

const ForeignMessage = defineMessageUnion({ ForeignFact: {} })
const encodedCounterMessage: Readonly<{
  _tag: 'RequestedAdd'
  amount: string
}> = { _tag: 'RequestedAdd', amount: '2' }

// @ts-expect-error The selected child Binding does not accept another Message union.
toParentMessage(AccessorBinding, ForeignMessage.ForeignFact())

// @ts-expect-error The helper accepts the transformed payload's decoded number, not encoded string.
toParentMessage(AccessorBinding, encodedCounterMessage)

// @ts-expect-error Static Bindings do not accept a key.
toParentMessage(AccessorBinding, 'first', CounterMessage.ClickedIncrement())

// @ts-expect-error Keyed Bindings require a key.
toParentMessage(KeyedFieldBinding, CounterMessage.ClickedIncrement())

// @ts-expect-error The direct keyed field decodes a string key.
toParentMessage(KeyedFieldBinding, 1, CounterMessage.ClickedIncrement())

// @ts-expect-error The transformed Codec receives its decoded number, not encoded string.
toParentMessage(NumericBinding, '1', CounterMessage.ClickedIncrement())

// @ts-expect-error Literal-key Bindings retain their exact decoded key union.
toParentMessage(LiteralBinding, 'Tertiary', CounterMessage.ClickedIncrement())

// @ts-expect-error A parent envelope is not a raw child Message for the same Binding.
toParentMessage(NestedChildBinding, nestedChildParentMessage)

// @ts-expect-error A Message-free Binding has no generated parent envelope.
toParentMessage(MessageFreeBinding, CounterMessage.ClickedIncrement())

toParentMessage(
  PrimaryChoiceBinding,
  // @ts-expect-error Generic factory instances retain incompatible child payloads.
  SecondaryChoice.Message.make({ value: 'Three' }),
)

toParentMessage(
  KeyedFieldBinding,
  'first',
  CounterMessage.ClickedIncrement(),
  // @ts-expect-error A keyed call does not accept extra generation or origin input.
  4,
)

const mixedBinding =
  globalThis.Math.random() > 0.5 ? AccessorBinding : KeyedFieldBinding

// @ts-expect-error A static/keyed Binding union cannot select one safe arity.
toParentMessage(mixedBinding, CounterMessage.ClickedIncrement())

const mixedKeyedBinding =
  globalThis.Math.random() > 0.5 ? NumericBinding : LiteralBinding

// @ts-expect-error A keyed Binding union does not retain one correlated key contract.
toParentMessage(mixedKeyedBinding, 1, CounterMessage.ClickedIncrement())

const mixedStaticBinding =
  globalThis.Math.random() > 0.5 ? AccessorBinding : PrimaryChoiceBinding

// @ts-expect-error A Binding union does not retain one correlated child Message contract.
toParentMessage(mixedStaticBinding, CounterMessage.ClickedIncrement())

declare const erasedBinding: Block.AnyBinding
declare const anyBinding: any
declare const unknownBinding: unknown

// @ts-expect-error A Binding erased to the unsupported broad contract has no exact generated envelope.
toParentMessage(erasedBinding, PolicyChildMessage.RequestedIncrement())

// @ts-expect-error An any Binding cannot establish generated Binding provenance.
toParentMessage(anyBinding, CounterMessage.ClickedIncrement())

// @ts-expect-error An unknown value cannot establish generated Binding provenance.
toParentMessage(unknownBinding, CounterMessage.ClickedIncrement())

// @ts-expect-error Nested wrapping must use the Binding for the next exact boundary.
toParentMessage(AccessorBinding, NestedChildMessage.ChangedValue())
