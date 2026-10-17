import { Array, Layer, Option } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  ArrayChildBinding,
  ArrayChildBlock,
  BrandedEntriesBinding,
  CallableChildBlock,
  CallableEntriesBinding,
  ChildBlock,
  ChildCounter,
  DeclarationCallableKeyedFieldParent,
  DeclarationKeyedFieldParent,
  EntriesBinding,
  EquivalentEntriesBinding,
  InitializedEntriesBinding,
  LiteralEntriesBinding,
  OutEntriesBinding,
  ParentMessage,
  ReadChildCount,
  RefinedId,
  RoomBinding,
  SuspendedEntriesBinding,
  callableInitialParentModel,
  foldArrayChild,
  foldCallableEntry,
  foldEntry,
  foldRoom,
  foldWrappedRow,
  initialParentModel,
  initializeKeyedParent,
  outEntriesInspection,
} from './keyed-field-binding.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type Key = Expect<
  Equal<Parameters<typeof EntriesBinding.fold>[1], string>
>
export type Placement = Expect<
  Equal<typeof EntriesBinding.placement, 'entries'>
>
export type CallablePlacement = Expect<
  Equal<typeof CallableEntriesBinding.placement, 'entries'>
>
export type RoomPlacement = Expect<
  Equal<typeof RoomBinding.placement, 'DeclarationKeyedFieldChild'>
>
export type CallableParentModel = Expect<
  Equal<
    Parameters<typeof CallableEntriesBinding.fold>[0],
    typeof DeclarationCallableKeyedFieldParent.Model.Type &
      Update.GraphCapability<
        typeof DeclarationCallableKeyedFieldParent.Model.Type,
        Block.BindingRequirement<'entries', typeof CallableChildBlock>
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
    typeof DeclarationKeyedFieldParent.Model.Type &
      Update.GraphCapability<
        typeof DeclarationKeyedFieldParent.Model.Type,
        Block.BindingRequirement<'entries', typeof ChildBlock>
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
      typeof DeclarationKeyedFieldParent.Model.Type,
      typeof ParentMessage.Type,
      never,
      never,
      Block.BindingRequirement<'entries', typeof ChildBlock>
    >
  >
>
export type Registration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof EntriesBinding.fold>>,
    import('foldkit').Block.BindingRequirement<'entries', typeof ChildBlock>
  >
>
export type InitializedPlacement = Expect<
  Equal<typeof InitializedEntriesBinding.placement, 'entries'>
>
export type OutKey = Expect<
  Equal<Parameters<typeof OutEntriesBinding.fold>[1], string>
>
export type OutRefreshRequirements = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof OutEntriesBinding.refresh>>,
    Block.Scoped<'outEntries', Command.HandlerOf<typeof ReadChildCount>>
  >
>
export type OutInspectionServices = Expect<
  Equal<Layer.Services<typeof outEntriesInspection.EffectsLayer>, ChildCounter>
>

foldEntry(
  initialParentModel,
  ParentMessage.GotEntryMessage({
    id: 'first',
    message: ChildBlock.Message.UpdatedCount({ count: 2 }),
  }),
  'first',
  ChildBlock.Message.UpdatedCount({ count: 2 }),
)
foldCallableEntry(
  callableInitialParentModel,
  ParentMessage.GotEntryMessage({
    id: 'first',
    message: ChildBlock.Message.UpdatedCount({ count: 2 }),
  }),
  'first',
  CallableChildBlock.Message.UpdatedCount({ count: 2 }),
)
foldArrayChild(
  initialParentModel,
  ParentMessage.GotArrayChildMessage({
    message: ArrayChildBlock.Message.IgnoredValue(),
  }),
  ArrayChildBlock.Message.IgnoredValue(),
)
Option.getOrThrow(Array.head(initialParentModel.entries))
foldWrappedRow(
  initialParentModel,
  ParentMessage.GotWrappedMessage({
    rowId: 'row',
    message: ChildBlock.Message.UpdatedCount({ count: 2 }),
  }),
  'row',
  ChildBlock.Message.UpdatedCount({ count: 2 }),
)
foldRoom(
  initialParentModel,
  ParentMessage.GotRoomMessage({
    roomId: 'room',
    message: ChildBlock.Message.UpdatedCount({ count: 2 }),
  }),
  'room',
  ChildBlock.Message.UpdatedCount({ count: 2 }),
)

const mapped = ParentMessage.GotEntryMessage({
  id: 'first',
  message: ChildBlock.Message.UpdatedCount({ count: 3 }),
})
initializeKeyedParent('Ready')
void mapped
