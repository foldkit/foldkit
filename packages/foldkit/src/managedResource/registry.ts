import type { Layer } from 'effect'

/** @internal Retains the entry record behind an owned ManagedResource registry. */
export const RegistryEntriesTypeId = Symbol(
  'foldkit/ManagedResource/RegistryEntries',
)

/** @internal Retains the entry record behind an owned ManagedResource registry. */
export type Registry<Entries> = Readonly<{
  [RegistryEntriesTypeId]: Entries
}>

/** @internal Returns the exact ManagedResource entries represented by a plain or owned registry. */
export type RegistryEntries<Resources> = Resources extends unknown
  ? typeof RegistryEntriesTypeId extends keyof Resources
    ? Omit<Resources, typeof RegistryEntriesTypeId | 'layer'>
    : Resources
  : never

type EntryLayers<Entries> = Entries[keyof Entries] extends infer ResourceEntry
  ? ResourceEntry extends Readonly<{
      layer: infer EntryLayer extends Layer.Any
    }>
    ? EntryLayer
    : never
  : never

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnion<Value, Whole = Value> = [Value] extends [never]
  ? false
  : Value extends Whole
    ? [Whole] extends [Value]
      ? false
      : true
    : never

type LayerChannels<EntryLayer extends Layer.Any> = readonly [
  Layer.Success<EntryLayer>,
  Layer.Error<EntryLayer>,
  Layer.Services<EntryLayer>,
]

type SameLayerChannels<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : false
  : false

type LayerOfEntry<ResourceEntry> =
  ResourceEntry extends Readonly<{
    layer: infer EntryLayer extends Layer.Any
  }>
    ? EntryLayer
    : never

type LayerContractAgreement<
  EntryLayer extends Layer.Any,
  WholeLayer extends Layer.Any = EntryLayer,
> = EntryLayer extends Layer.Any
  ? SameLayerChannels<LayerChannels<EntryLayer>, LayerChannels<WholeLayer>>
  : never

type EntryContractAgreement<
  ResourceEntry,
  Whole = ResourceEntry,
> = ResourceEntry extends unknown
  ? LayerContractAgreement<LayerOfEntry<ResourceEntry>, LayerOfEntry<Whole>>
  : never

type HasAlternativeEntryContracts<Entries> = {
  [Key in keyof Entries]-?: false extends EntryContractAgreement<Entries[Key]>
    ? true
    : never
}[keyof Entries]

type HasWidenedLayer<Entries> =
  Entries[keyof Entries] extends infer ResourceEntry
    ? ResourceEntry extends Readonly<{
        layer: infer EntryLayer extends Layer.Any
      }>
      ? Layer.Any extends EntryLayer
        ? true
        : never
      : true
    : never

type RegistryLayer<Entries> = Readonly<{
  layer: [keyof Entries] extends [never]
    ? Layer.Layer<never>
    : Layer.Layer<
        Layer.Success<EntryLayers<Entries>>,
        Layer.Error<EntryLayers<Entries>>,
        Layer.Services<EntryLayers<Entries>>
      >
}>

type MaybeRegistryLayer<Entries> = [keyof Entries] extends [never]
  ? RegistryLayer<Entries>
  : IsAny<Entries> extends true
    ? unknown
    : true extends IsUnion<Entries>
      ? unknown
      : string extends keyof Entries
        ? unknown
        : number extends keyof Entries
          ? unknown
          : [Extract<keyof Entries, symbol>] extends [never]
            ? [Entries[keyof Entries]] extends [Readonly<{ layer: Layer.Any }>]
              ? true extends
                  | HasWidenedLayer<Entries>
                  | HasAlternativeEntryContracts<Entries>
                ? unknown
                : RegistryLayer<Entries>
              : unknown
            : unknown

/** @internal An owned registry with an aggregate Layer only when every entry contract is closed and attached. */
export type OwnedRegistry<Entries> = Readonly<Entries> &
  Registry<Readonly<Entries>> &
  MaybeRegistryLayer<Entries>
