import { Array, Schema } from 'effect'

import { isCallableTaggedStruct } from '../schema/index.js'
import type { BindingDeliveryEvidence } from './delivery.js'
import type { InstanceKey } from './instanceContext.js'
import { runtimeMessageSchemaContract } from './messageSchemaContract.js'
import { assertSegment } from './scope.js'

type CapitalizedSegments<Placement extends string> =
  Placement extends `${infer Head}-${infer Tail}`
    ? `${CapitalizedSegments<Head>}${CapitalizedSegments<Tail>}`
    : Placement extends `${infer Head}_${infer Tail}`
      ? `${CapitalizedSegments<Head>}${CapitalizedSegments<Tail>}`
      : Placement extends `${infer Head} ${infer Tail}`
        ? `${CapitalizedSegments<Head>}${CapitalizedSegments<Tail>}`
        : Capitalize<Placement>

/** @internal Readable delivery tag derived from a Binding's resolved placement. */
export type ChildMessageTag<Placement extends string> =
  `Got${CapitalizedSegments<Placement>}Message`

/** @internal Capitalizes separator-delimited segments without changing inner capitals. */
export function childMessageTag<const Placement extends string>(
  placement: Placement,
): ChildMessageTag<Placement>
export function childMessageTag(placement: string): string {
  assertSegment(placement)

  const name = placement
    .split(/[-_ ]+/)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')

  if (name === '') {
    throw new Error(
      `[foldkit] Binding placement "${placement}" cannot produce a readable child Message name. Choose a placement with a named segment.`,
    )
  }

  return `Got${name}Message`
}

const Generation = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))

/** @internal Serializable origin of one unkeyed child Message. */
export type ChildEnvelope<Placement extends string, Message> = Readonly<{
  _tag: ChildMessageTag<Placement>
  placement: Placement
  generation: number
  message: Message
}>

const envelopeContracts = new WeakMap<
  Schema.Top,
  Readonly<{ placement: string; tag: string; isKeyed: boolean }>
>()

/** @internal Serializable origin of one keyed child Message. */
export type KeyedChildEnvelope<
  Placement extends string,
  Key,
  Message,
> = Readonly<{
  _tag: ChildMessageTag<Placement>
  placement: Placement
  generation: number
  key: Key
  message: Message
}>

/** @internal Recovers only Codecs produced by generated child delivery. */
export type GeneratedEnvelopeOf<Binding> =
  Binding extends BindingDeliveryEvidence<any, any, infer Envelope>
    ? Envelope
    : never

type LocalConstructors<Local extends Schema.Top> = {
  readonly [
    Key in keyof Local as 0 extends 1 & Local[Key]
      ? never
      : [Local[Key]] extends [never]
        ? never
        : Local[Key] extends Schema.Top &
              ((...args: ReadonlyArray<any>) => unknown)
          ? Key
          : never
  ]: Local[Key]
}

/** @internal Complete dispatch contract derived from local facts and a checked graph. */
export type DispatchSchemaFor<
  Local extends Schema.Top,
  Bindings extends ReadonlyArray<unknown>,
> = [GeneratedEnvelopeOf<Bindings[number]>] extends [never]
  ? Local
  : Schema.Codec<
      Local['Type'] | GeneratedEnvelopeOf<Bindings[number]>['Type'],
      Local['Encoded'] | GeneratedEnvelopeOf<Bindings[number]>['Encoded'],
      | Local['DecodingServices']
      | GeneratedEnvelopeOf<Bindings[number]>['DecodingServices'],
      | Local['EncodingServices']
      | GeneratedEnvelopeOf<Bindings[number]>['EncodingServices']
    > &
      LocalConstructors<Local>

const generatedDeliveries = new WeakMap<object, Schema.Top>()

/** @internal Records generated delivery without adding author-facing constructors. */
export const registerGeneratedDelivery = (
  binding: object,
  envelope: Schema.Top,
): void => {
  if (!envelopeContracts.has(envelope)) {
    throw new Error(
      '[foldkit] Generated child delivery must use its Binding envelope Schema.',
    )
  }
  generatedDeliveries.set(binding, envelope)
}

/** @internal Reads the exact generated envelope Codec retained by a Binding. */
export const generatedEnvelopeSchemaOf = (
  binding: object,
): Schema.Top | undefined => generatedDeliveries.get(binding)

/** @internal Reads generated origin metadata without trusting a Message's shape. */
export const generatedDeliveryOf = (
  binding: object,
):
  | Readonly<{
      placement: string
      tag: string
      isKeyed: boolean
    }>
  | undefined => {
  const envelope = generatedDeliveries.get(binding)
  return envelope === undefined ? undefined : envelopeContracts.get(envelope)
}

/** @internal Reads the registered envelope contracts in graph order. */
export const generatedEnvelopeSchemas = (
  bindings: ReadonlyArray<object>,
): ReadonlyArray<Schema.Top> =>
  bindings.flatMap(binding => {
    const envelope = generatedDeliveries.get(binding)
    return envelope === undefined ? [] : [envelope]
  })

/** @internal Derives an exact child delivery Codec without constructing effects. */
export function makeChildEnvelopeSchema<
  const Placement extends string,
  Message extends Schema.Top,
>(
  placement: Placement,
  message: Message,
): Schema.Codec<
  ChildEnvelope<Placement, Message['Type']>,
  ChildEnvelope<Placement, Message['Encoded']>,
  Message['DecodingServices'],
  Message['EncodingServices']
>
export function makeChildEnvelopeSchema<
  const Placement extends string,
  Message extends Schema.Top,
  Key extends Schema.Top,
>(
  placement: Placement,
  message: Message,
  key: Key & Schema.Schema<InstanceKey>,
): Schema.Codec<
  KeyedChildEnvelope<Placement, Key['Type'], Message['Type']>,
  KeyedChildEnvelope<Placement, Key['Encoded'], Message['Encoded']>,
  Message['DecodingServices'] | Key['DecodingServices'],
  Message['EncodingServices'] | Key['EncodingServices']
>
export function makeChildEnvelopeSchema(
  placement: string,
  message: Schema.Top,
  key?: Schema.Top,
): Schema.Top {
  const tag = childMessageTag(placement)

  const fields = {
    _tag: Schema.Literal(tag),
    placement: Schema.Literal(placement),
    generation: Generation,
    message,
  }

  const envelope =
    key === undefined
      ? Schema.Struct(fields)
      : Schema.Struct({ ...fields, key })

  envelopeContracts.set(envelope, {
    placement,
    tag,
    isKeyed: key !== undefined,
  })
  return envelope
}

/** @internal Combines local facts with the registered children's delivery Codecs. */
export function makeDispatchSchema<
  Local extends Schema.Top,
  const Children extends ReadonlyArray<Schema.Top>,
>(
  local: Local,
  children: Children,
): Schema.Codec<
  Local['Type'] | Children[number]['Type'],
  Local['Encoded'] | Children[number]['Encoded'],
  Local['DecodingServices'] | Children[number]['DecodingServices'],
  Local['EncodingServices'] | Children[number]['EncodingServices']
> &
  LocalConstructors<Local>
export function makeDispatchSchema(
  local: Schema.Top,
  children: ReadonlyArray<Schema.Top>,
): Schema.Top {
  const placementsByTag = new Map<string, string>()
  const localTags = runtimeMessageSchemaContract(local).tags

  for (const child of children) {
    const contract = envelopeContracts.get(child)
    if (contract === undefined) {
      throw new Error(
        '[foldkit] A child dispatch Schema must come from its registered Binding.',
      )
    }

    if (localTags.has(contract.tag)) {
      throw new Error(
        `[foldkit] Binding placement "${contract.placement}" generates child Message "${contract.tag}", which conflicts with a local Message. Remove the manually declared child wrapper or choose a distinct placement.`,
      )
    }

    const previous = placementsByTag.get(contract.tag)
    if (previous !== undefined) {
      throw new Error(
        `[foldkit] Binding placements "${previous}" and "${contract.placement}" both generate child Message "${contract.tag}". Choose placements with distinct formatted names.`,
      )
    }

    placementsByTag.set(contract.tag, contract.placement)
  }

  if (Array.isReadonlyArrayEmpty(children)) {
    return local
  }

  const dispatch = Schema.Union([local, ...children])
  const constructors = Object.entries(
    Object.getOwnPropertyDescriptors(local),
  ).filter(([, descriptor]) => isCallableTaggedStruct(descriptor.value))

  for (const [name] of constructors) {
    if (Reflect.has(dispatch, name)) {
      throw new Error(
        `[foldkit] Local Message constructor "${name}" conflicts with the generated dispatch Schema surface. Choose a Message name that does not replace a Schema member.`,
      )
    }
  }

  for (const [name, descriptor] of constructors) {
    Object.defineProperty(dispatch, name, descriptor)
  }

  return dispatch
}
