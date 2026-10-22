import type { Layer } from 'effect'
import type { Block, Update } from 'foldkit'

import type { HandlerRequirementsOfBinding, ParentContractOfBinding } from '../../foldkit/dist/block/binding'
import type { IncomingMessageOfBinding, OutgoingMessageOfBinding } from '../../foldkit/dist/block/delivery'
import type { InitialEvidenceOfBinding } from '../../foldkit/dist/block/initialization'
import type { UiContract } from '../src/page/ui/block.contract'
import type { Actual as Original } from './ui.witness'

type Assert<Value extends true> = Value
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Inferred = typeof Original
type BindingChannels<Binding> = Readonly<{
  block: Block.BlockOfBinding<Binding>
  handlers: HandlerRequirementsOfBinding<Binding>
  inspection: Block.InspectionOfBinding<Binding>
  parent: ParentContractOfBinding<Binding>
  initialization: InitialEvidenceOfBinding<Binding>
  incoming: IncomingMessageOfBinding<Binding>
  outgoing: OutgoingMessageOfBinding<Binding>
  registration: Block.RequirementOfBinding<Binding>
}>
type Indices = Extract<keyof UiContract['bindings'], `${number}`>
export type AllBindingChannelsEqual = Assert<
  Equal<
    {
      [Index in Indices]: Equal<
        BindingChannels<Inferred['bindings'][Index]>,
        BindingChannels<UiContract['bindings'][Index]>
      >
    }[Indices],
    true
  >
>
export type AllBindingKeysEqual = Assert<
  Equal<
    {
      [Index in Indices]: Equal<
        keyof Inferred['bindings'][Index],
        keyof UiContract['bindings'][Index]
      >
    }[Indices],
    true
  >
>
export type InitCommandRequirements = Assert<
  Equal<
    Update.RequirementsOf<Inferred['init']>,
    Update.RequirementsOf<UiContract['init']>
  >
>
export type UpdateCommandRequirements = Assert<
  Equal<
    Update.RequirementsOf<Inferred['update']>,
    Update.RequirementsOf<UiContract['update']>
  >
>
export type LayerServices = Assert<
  Equal<
    Layer.Services<Inferred['EffectsLayer']>,
    Layer.Services<UiContract['EffectsLayer']>
  >
>
export type LayerErrors = Assert<
  Equal<
    Layer.Error<Inferred['EffectsLayer']>,
    Layer.Error<UiContract['EffectsLayer']>
  >
>
export type LayerOutputs = Assert<
  Equal<
    Layer.Success<Inferred['EffectsLayer']>,
    Layer.Success<UiContract['EffectsLayer']>
  >
>
export type OutMessage = Assert<
  Equal<Inferred['OutMessage'], UiContract['OutMessage']>
>
