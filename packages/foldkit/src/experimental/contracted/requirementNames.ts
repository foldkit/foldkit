type Channel<
  Value,
  Key extends PropertyKey,
  Default = never,
> = Value extends unknown
  ? Key extends keyof Value
    ? Value[Key]
    : Default
  : never

type Effects<Config> = Channel<Config, 'effects'>
type Operations<Config> = Channel<
  Config,
  'operations',
  Readonly<Record<never, never>>
>
type InMessageOutputs<Config> = Channel<
  Config,
  'inMessageOutputs',
  Readonly<Record<never, never>>
>
type LegacyManagedResourceKey<Value> = Value extends unknown
  ? 'resources' extends keyof Value
    ? true
    : never
  : never

type LegacyManagedResourceEntries<Entries> = Entries extends unknown
  ? {
      [Name in keyof Entries]: LegacyManagedResourceKey<Entries[Name]>
    }[keyof Entries]
  : never

/** @internal Rejects the former ManagedResource requirement key at each declaration boundary. */
export type LegacyManagedResourceConfiguration<Config> =
  | LegacyManagedResourceKey<Effects<Config>>
  | LegacyManagedResourceEntries<Operations<Config>>
  | LegacyManagedResourceEntries<InMessageOutputs<Config>>
