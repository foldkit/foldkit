import { Predicate, Schema } from 'effect'

import type { AnyBinding, BlockOfBinding } from '../block/binding.js'
import {
  type GeneratedEnvelopeOf,
  generatedDeliveryOf,
  generatedEnvelopeSchemaOf,
} from '../block/childEnvelope.js'
import { canonicalBindingOf, runtimeBindingOf } from '../block/composition.js'

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never

type ChildMessageOf<BindingValue> =
  BlockOfBinding<BindingValue> extends Readonly<{
    Message: Readonly<{ Type: infer Message }>
  }>
    ? Message
    : never

type GeneratedEnvelopeSchemaOf<BindingValue> = GeneratedEnvelopeOf<BindingValue>

type GeneratedParentMessageOf<BindingValue> =
  GeneratedEnvelopeSchemaOf<BindingValue> extends Schema.Top
    ? GeneratedEnvelopeSchemaOf<BindingValue>['Type']
    : never

type GeneratedBindingConstraint<BindingValue> =
  IsAny<GeneratedEnvelopeSchemaOf<BindingValue>> extends true
    ? never
    : true extends IsUnion<BindingValue>
      ? never
      : [GeneratedEnvelopeSchemaOf<BindingValue>] extends [never]
        ? never
        : unknown

type StaticBindingConstraint<BindingValue> =
  Extract<
    GeneratedParentMessageOf<BindingValue>,
    Readonly<{ key: unknown }>
  > extends never
    ? unknown
    : never

type KeyedBindingConstraint<BindingValue> =
  Exclude<
    GeneratedParentMessageOf<BindingValue>,
    Readonly<{ key: unknown }>
  > extends never
    ? unknown
    : never

type KeyOfBinding<BindingValue> =
  GeneratedParentMessageOf<BindingValue> extends Readonly<{ key: infer Key }>
    ? Key
    : never

/**
 * Wraps one decoded child Message through an actual generated Binding for a
 * parent Story or other headless test.
 *
 * Static Bindings take the child Message directly. Keyed Bindings take their
 * decoded key first. The helper calls the Binding's original tracked mapper and
 * returns its exact parent envelope with synthetic generation `0`. It does not
 * select a live occurrence, run update or policy, render a view, or execute
 * effects. Dispatch the returned Message through the parent Story to exercise
 * the parent's ordinary Model presence, delivery, context, and policy checks.
 * Synthetic headless Messages do not exercise Runtime live-origin or lifecycle
 * admission; use a Scene or view-origin path for those checks.
 *
 * Inputs are decoded values and are validated as decoded values. Do not pass an
 * encoded Codec input. The helper supports only generated delivery from a
 * parent Definition Binding; manually mapped and Message-free Bindings have no
 * generated envelope to wrap. Pass one narrowed Binding. Branch before calling
 * when a test holds a union of Bindings so its key and child Message stay
 * correlated with the selected Binding.
 */
export function toParentMessage<const BindingValue extends AnyBinding>(
  binding: BindingValue &
    GeneratedBindingConstraint<BindingValue> &
    StaticBindingConstraint<BindingValue>,
  message: ChildMessageOf<BindingValue>,
): GeneratedParentMessageOf<BindingValue>
export function toParentMessage<const BindingValue extends AnyBinding>(
  binding: BindingValue &
    GeneratedBindingConstraint<BindingValue> &
    KeyedBindingConstraint<BindingValue>,
  key: KeyOfBinding<BindingValue>,
  message: ChildMessageOf<BindingValue>,
): GeneratedParentMessageOf<BindingValue>
export function toParentMessage(
  binding: unknown,
  ...args: ReadonlyArray<unknown>
): unknown {
  if (!Predicate.isObject(binding) || globalThis.Array.isArray(binding)) {
    throw new Error(
      '[foldkit] Test.toParentMessage requires an actual generated child Binding.',
    )
  }

  const canonicalBinding = canonicalBindingOf(binding)
  let runtimeBinding: ReturnType<typeof runtimeBindingOf>
  try {
    runtimeBinding = runtimeBindingOf(binding)
  } catch (cause) {
    throw new Error(
      '[foldkit] Test.toParentMessage requires an actual generated child Binding.',
      { cause },
    )
  }

  const delivery = generatedDeliveryOf(canonicalBinding)
  const envelope = generatedEnvelopeSchemaOf(canonicalBinding)
  if (delivery === undefined || envelope === undefined) {
    throw new Error(
      `[foldkit] Test.toParentMessage requires generated delivery for Binding "${globalThis.String(Reflect.get(binding, 'placement'))}". Manually mapped and Message-free Bindings are unsupported.`,
    )
  }

  const expectedArguments = delivery.isKeyed ? 2 : 1
  if (args.length !== expectedArguments) {
    throw new Error(
      delivery.isKeyed
        ? `[foldkit] Test.toParentMessage for keyed Binding "${delivery.placement}" requires a decoded key and child Message.`
        : `[foldkit] Test.toParentMessage for static Binding "${delivery.placement}" requires only a child Message.`,
    )
  }

  const [first, second] = args
  const key = delivery.isKeyed ? first : undefined
  const message = delivery.isKeyed ? second : first
  const childMessageSchema = runtimeBinding.block.Message
  if (
    !Schema.isSchema(childMessageSchema) ||
    !Schema.is(childMessageSchema)(message)
  ) {
    throw new Error(
      `[foldkit] Test.toParentMessage child Message must be a decoded value accepted by Binding "${delivery.placement}".`,
    )
  }

  const parentMessage = Reflect.apply(
    runtimeBinding.toParentMessage,
    undefined,
    [key, message],
  )
  if (!Schema.is(envelope)(parentMessage)) {
    throw new Error(
      `[foldkit] Test.toParentMessage key must be a decoded value accepted by keyed Binding "${delivery.placement}".`,
    )
  }

  return parentMessage
}
