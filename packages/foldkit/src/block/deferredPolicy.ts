import type { Command } from '../command/index.js'
import type * as Update from '../update/index.js'
import type { AnyBinding } from './binding.js'
import type { BindingPolicyEvidence } from './policyEvidence.js'
import type { QualifyOwned } from './scope.js'

declare const DeferredBindingPolicyTypeId: unique symbol

/** @internal Identifies one Binding policy without retaining its inferred value. */
export interface DeferredBindingPolicy<
  Placement extends string,
  ChildId extends string,
> {
  readonly [DeferredBindingPolicyTypeId]: Readonly<{
    placement: Placement
    childId: ChildId
  }>
}

type AnyFunction = (...args: ReadonlyArray<any>) => any

type FieldOf<Value, Key extends PropertyKey> = Value extends unknown
  ? Key extends keyof Value
    ? Exclude<Value[Key], undefined>
    : never
  : never

type ReturnOf<Value> = Value extends AnyFunction ? ReturnType<Value> : never

type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never

type IndexedPlacement<Placement extends string> =
  {} extends Record<Placement, never>
    ? never
    : true extends IsUnion<Placement>
      ? never
      : `${Placement}` extends Placement
        ? Placement
        : never

declare const UnindexedPlacementKey: unique symbol

type BindingIndex<Children extends ReadonlyArray<AnyBinding>> = {
  readonly [
    BindingValue in Children[number] as [
      IndexedPlacement<BindingValue['placement']>,
    ] extends [never]
      ? typeof UnindexedPlacementKey
      : BindingValue['placement']
  ]: BindingValue
}

type UnindexedBindings<
  Index,
  Keys extends keyof Index,
> = typeof UnindexedPlacementKey extends Keys
  ? Index[typeof UnindexedPlacementKey]
  : never

type ScanBindingAt<BindingValue, Placement extends string> =
  BindingValue extends Readonly<{ placement: Placement }> ? BindingValue : never

/** @internal Resolves the registered Bindings whose placement is assignable to
 * `Placement`. */
export type BindingAt<
  Children extends ReadonlyArray<AnyBinding>,
  Placement extends string,
  Index = BindingIndex<Children>,
  Keys extends keyof Index = keyof Index,
> = [IndexedPlacement<Placement>] extends [never]
  ? ScanBindingAt<Children[number], Placement>
  :
      | (Placement extends Keys ? Index[Placement] : never)
      | ScanBindingAt<UnindexedBindings<Index, Keys>, Placement>

type PolicyOfBinding<BindingValue> =
  BindingValue extends BindingPolicyEvidence<infer Policy> ? Policy : never

type PolicyFoldReturn<Policy> = ReturnOf<ReturnOf<FieldOf<Policy, 'fold'>>>

type ForwardedOutMessage<Policy> = Exclude<
  ReturnOf<FieldOf<Policy, 'forward'>>,
  undefined
>

type CommandMessage<Output> =
  FieldOf<Output, 'commands'> extends ReadonlyArray<infer CommandValue>
    ? CommandValue extends Command<infer Message, any, any>
      ? Message
      : never
    : never

type OutputOutMessage<Output> = FieldOf<Output, 'outMessage'>

type OutputModel<Output> = FieldOf<Output, 'model'>

type EmptyChannels = Readonly<{
  message: never
  outMessage: never
  requirements: never
  registration: never
}>

type PolicyChannels<
  Marker,
  Children extends ReadonlyArray<AnyBinding>,
  VisitedPlacements extends string,
> =
  Marker extends DeferredBindingPolicy<infer Placement, infer ChildId>
    ? Placement extends VisitedPlacements
      ? EmptyChannels
      : BindingAt<Children, Placement> extends infer BindingValue
        ? PolicyOfBinding<BindingValue> extends infer Policy
          ? ResolveCompositionOutput<
              PolicyFoldReturn<Policy>,
              Children,
              VisitedPlacements | Placement
            > extends infer FoldOutput
            ? Readonly<{
                message: CommandMessage<FoldOutput>
                outMessage:
                  | ForwardedOutMessage<Policy>
                  | OutputOutMessage<FoldOutput>
                requirements: QualifyOwned<
                  Placement,
                  ChildId,
                  Update.RequirementsOf<() => FoldOutput>
                >
                registration: Update.RegistrationEvidenceOf<FoldOutput>
              }>
            : EmptyChannels
          : EmptyChannels
        : EmptyChannels
    : EmptyChannels

type DeferredChannels<
  Output,
  Children extends ReadonlyArray<AnyBinding>,
  VisitedPlacements extends string,
> = PolicyChannels<
  Update.DeferredResultEvidenceOf<Output> extends infer Evidence
    ? Evidence extends Update.DeferredResultEvidence<infer Marker>
      ? Marker
      : never
    : never,
  Children,
  VisitedPlacements
>

type ResolvedReturn<
  Output,
  Children extends ReadonlyArray<AnyBinding>,
  VisitedPlacements extends string,
> =
  DeferredChannels<Output, Children, VisitedPlacements> extends infer Channels
    ? Channels extends Readonly<{
        message: infer PolicyMessage
        outMessage: infer PolicyOutMessage
        requirements: infer PolicyRequirements
        registration: infer PolicyRegistration
      }>
      ? Update.WithRegistrationEvidence<
          [OutputOutMessage<Output> | PolicyOutMessage] extends [never]
            ? Update.Return<
                OutputModel<Output>,
                CommandMessage<Output> | PolicyMessage,
                Update.RequirementsOf<() => Output> | PolicyRequirements
              >
            : Update.ReturnWithOutMessage<
                OutputModel<Output>,
                CommandMessage<Output> | PolicyMessage,
                OutputOutMessage<Output> | PolicyOutMessage,
                Update.RequirementsOf<() => Output> | PolicyRequirements
              >,
          Update.RegistrationEvidenceOf<Output> | PolicyRegistration
        >
      : never
    : never

/** @internal Resolves Binding policy channels against a completed graph. */
export type ResolveCompositionOutput<
  Value,
  Children extends ReadonlyArray<AnyBinding>,
  VisitedPlacements extends string = never,
> = [Value] extends [never]
  ? never
  : Update.ResolvedOperationOutput<Value> extends infer Output
    ? Output extends Readonly<{ model: unknown }>
      ? [Update.DeferredResultEvidenceOf<Output>] extends [never]
        ? Output
        : ResolvedReturn<Output, Children, VisitedPlacements>
      : Output
    : never
