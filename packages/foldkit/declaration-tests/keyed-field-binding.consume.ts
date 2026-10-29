import { Array, Layer, Option, Schema } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  ArrayChildBinding,
  ArrayChildBlock,
  BrandedEntriesBinding,
  CallableChildBlock,
  CallableEntriesBinding,
  CallableParentMessage,
  ChildBlock,
  ChildCounter,
  DeclarationCallableKeyedFieldParentDefinition,
  DeclarationKeyedFieldParentComposition,
  DeclarationKeyedFieldParentDefinition,
  EntriesBinding,
  EquivalentEntriesBinding,
  InitializedEntriesBinding,
  LiteralEntriesBinding,
  OutEntriesBinding,
  ParentMessage,
  ReadChildCount,
  RefinedId,
  RefinedKeyBlock,
  RoomBinding,
  SuspendedEntriesBinding,
  callableInitialParentModel,
  foldArrayChild,
  foldCallableEntry,
  foldEntry,
  foldRoom,
  foldWrappedRow,
  initKeyedParent,
  initialParentModel,
  outEntriesInspection,
} from './keyed-field-binding.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

type KeyedEnvelope<
  Tag extends string,
  Placement extends string,
  Key,
  ChildMessage,
> = Readonly<{
  _tag: Tag
  placement: Placement
  generation: number
  key: Key
  message: ChildMessage
}>

type Envelope<
  Tag extends string,
  Placement extends string,
  ChildMessage,
> = Readonly<{
  _tag: Tag
  placement: Placement
  generation: number
  message: ChildMessage
}>

type EntryEnvelope = KeyedEnvelope<
  'GotDeclarationKeyedFieldChildMessage',
  'DeclarationKeyedFieldChild',
  string,
  typeof ChildBlock.Message.Type
>

export type Key = Expect<
  Equal<Parameters<typeof EntriesBinding.fold>[1], string>
>
export type Placement = Expect<
  Equal<typeof EntriesBinding.placement, 'DeclarationKeyedFieldChild'>
>
export type CallablePlacement = Expect<
  Equal<
    typeof CallableEntriesBinding.placement,
    'DeclarationCallableKeyedFieldChild'
  >
>
export type RoomPlacement = Expect<Equal<typeof RoomBinding.placement, 'room'>>
export type CallableParentModel = Expect<
  Equal<
    Parameters<typeof CallableEntriesBinding.fold>[0],
    typeof DeclarationCallableKeyedFieldParentDefinition.Model.Type &
      Update.GraphCapability<
        typeof DeclarationCallableKeyedFieldParentDefinition.Model.Type,
        Block.RequirementOfBinding<typeof CallableEntriesBinding>
      >
  >
>
export type EquivalentKey = Expect<
  Equal<Parameters<typeof EquivalentEntriesBinding.fold>[1], string>
>
export type SuspendedKey = Expect<
  Equal<Parameters<typeof SuspendedEntriesBinding.fold>[1], string>
>
export type BrandedKey = Expect<
  Equal<Parameters<typeof BrandedEntriesBinding.fold>[1], typeof RefinedId.Type>
>
export type LiteralKey = Expect<
  Equal<Parameters<typeof LiteralEntriesBinding.fold>[1], 'Child'>
>
export type ArrayChildPlacement = Expect<
  Equal<typeof ArrayChildBinding.placement, 'arrayChild'>
>
export type ArrayChildMessage = Expect<
  Equal<
    Parameters<typeof ArrayChildBinding.fold>[1],
    typeof ArrayChildBlock.Message.Type
  >
>
export type ParentModel = Expect<
  Equal<
    Parameters<typeof EntriesBinding.fold>[0],
    typeof DeclarationKeyedFieldParentDefinition.Model.Type &
      Update.GraphCapability<
        typeof DeclarationKeyedFieldParentDefinition.Model.Type,
        Block.RequirementOfBinding<typeof EntriesBinding>
      >
  >
>
export type ChildMessage = Expect<
  Equal<
    Parameters<typeof EntriesBinding.fold>[2],
    typeof ChildBlock.Message.Type
  >
>
export type FoldModel = Expect<
  Equal<
    ReturnType<typeof EntriesBinding.fold>,
    Update.ResultRecipe<
      typeof DeclarationKeyedFieldParentDefinition.Model.Type,
      EntryEnvelope,
      never,
      never,
      Block.RequirementOfBinding<typeof EntriesBinding>
    >
  >
>

type CompleteDispatch =
  | typeof ParentMessage.Type
  | EntryEnvelope
  | KeyedEnvelope<
      'GotDeclarationRefinedKeyChildMessage',
      'DeclarationRefinedKeyChild',
      typeof RefinedId.Type,
      typeof RefinedKeyBlock.Message.Type
    >
  | KeyedEnvelope<
      'GotLiteralEntriesMessage',
      'literalEntries',
      'Child',
      typeof RefinedKeyBlock.Message.Type
    >
  | Envelope<
      'GotArrayChildMessage',
      'arrayChild',
      typeof ArrayChildBlock.Message.Type
    >
  | KeyedEnvelope<
      'GotWrappedRowsMessage',
      'wrappedRows',
      string,
      typeof ChildBlock.Message.Type
    >
  | KeyedEnvelope<
      'GotRoomMessage',
      'room',
      string,
      typeof ChildBlock.Message.Type
    >

type CompleteEncodedDispatch =
  | typeof ParentMessage.Encoded
  | KeyedEnvelope<
      'GotDeclarationKeyedFieldChildMessage',
      'DeclarationKeyedFieldChild',
      string,
      typeof ChildBlock.Message.Encoded
    >
  | KeyedEnvelope<
      'GotDeclarationRefinedKeyChildMessage',
      'DeclarationRefinedKeyChild',
      typeof RefinedId.Encoded,
      typeof RefinedKeyBlock.Message.Encoded
    >
  | KeyedEnvelope<
      'GotLiteralEntriesMessage',
      'literalEntries',
      'Child',
      typeof RefinedKeyBlock.Message.Encoded
    >
  | Envelope<
      'GotArrayChildMessage',
      'arrayChild',
      typeof ArrayChildBlock.Message.Encoded
    >
  | KeyedEnvelope<
      'GotWrappedRowsMessage',
      'wrappedRows',
      string,
      typeof ChildBlock.Message.Encoded
    >
  | KeyedEnvelope<
      'GotRoomMessage',
      'room',
      string,
      typeof ChildBlock.Message.Encoded
    >

export type CompleteDispatchType = Expect<
  Equal<
    typeof DeclarationKeyedFieldParentComposition.Message.Type,
    CompleteDispatch
  >
>
export type CompleteDispatchEncoded = Expect<
  Equal<
    typeof DeclarationKeyedFieldParentComposition.Message.Encoded,
    CompleteEncodedDispatch
  >
>
export type CompleteDispatchDecodingServices = Expect<
  Equal<
    typeof DeclarationKeyedFieldParentComposition.Message.DecodingServices,
    never
  >
>
export type CompleteDispatchEncodingServices = Expect<
  Equal<
    typeof DeclarationKeyedFieldParentComposition.Message.EncodingServices,
    never
  >
>
export type Registration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof EntriesBinding.fold>>,
    import('foldkit').Block.RequirementOfBinding<typeof EntriesBinding>
  >
>
export type InitializedPlacement = Expect<
  Equal<
    typeof InitializedEntriesBinding.placement,
    'DeclarationKeyedFieldChild'
  >
>
export type OutKey = Expect<
  Equal<Parameters<typeof OutEntriesBinding.fold>[1], string>
>
export type OutRefreshRequirements = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof OutEntriesBinding.refresh>>,
    Block.Scoped<
      'DeclarationKeyedFieldOutChild',
      Command.HandlerOf<typeof ReadChildCount>
    >
  >
>
export type OutInspectionServices = Expect<
  Equal<Layer.Services<typeof outEntriesInspection.EffectsLayer>, ChildCounter>
>

foldEntry(
  initialParentModel,
  ParentMessage.IgnoredChildMessage(),
  'first',
  ChildBlock.Message.UpdatedCount({ count: 2 }),
)
foldCallableEntry(
  callableInitialParentModel,
  CallableParentMessage.IgnoredChildMessage(),
  'first',
  CallableChildBlock.Message.UpdatedCount({ count: 2 }),
)
foldArrayChild(
  initialParentModel,
  ParentMessage.IgnoredChildMessage(),
  ArrayChildBlock.Message.IgnoredValue(),
)
Option.getOrThrow(Array.head(initialParentModel.entries))
foldWrappedRow(
  initialParentModel,
  ParentMessage.IgnoredChildMessage(),
  'row',
  ChildBlock.Message.UpdatedCount({ count: 2 }),
)
foldRoom(
  initialParentModel,
  ParentMessage.IgnoredChildMessage(),
  'room',
  ChildBlock.Message.UpdatedCount({ count: 2 }),
)

const mapped = Schema.decodeSync(
  DeclarationKeyedFieldParentComposition.Message,
)({
  _tag: 'GotDeclarationKeyedFieldChildMessage',
  placement: 'DeclarationKeyedFieldChild',
  generation: 0,
  key: 'first',
  message: ChildBlock.Message.UpdatedCount({ count: 3 }),
})
initKeyedParent('Ready')
void mapped
