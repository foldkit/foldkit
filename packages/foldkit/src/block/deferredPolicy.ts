import type { Command } from '../command/index.js'
import type * as Update from '../update/index.js'
import type { PolicyOfBinding } from './policyEvidence.js'
import type { QualifyOwned } from './scope.js'

declare const DeferredBindingPolicyTypeId: unique symbol
declare const InvalidCombinedStepsRegistrationEvidenceTypeId: unique symbol

/** @internal Identifies one Binding policy without retaining its inferred value. */
export interface DeferredBindingPolicy<
  Placement extends string,
  ChildId extends string,
> {
  readonly [DeferredBindingPolicyTypeId]: {
    readonly placement: Placement
    readonly childId: ChildId
  }
}

type AnyFunction = (...args: ReadonlyArray<any>) => any

type FieldOf<Value, Key extends PropertyKey> = Value extends unknown
  ? Key extends keyof Value
    ? Exclude<Value[Key], undefined>
    : never
  : never

type ReturnOf<Value> = Value extends AnyFunction ? ReturnType<Value> : never

type BindingAt<
  Children extends ReadonlyArray<unknown>,
  Placement extends string,
> = Extract<Children[number], Readonly<{ placement: Placement }>>

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

type InvalidCombinedStepsChannels = Readonly<{
  message: never
  outMessage: never
  requirements: never
  registration: typeof InvalidCombinedStepsRegistrationEvidenceTypeId
}>

type MarkersOf<Output> =
  Update.DeferredResultEvidenceOf<Output> extends infer Evidence
    ? Evidence extends Update.DeferredResultEvidence<infer Marker>
      ? Marker
      : never
    : never

type BindingMarkers<Marker> =
  Marker extends Update.DeferredCombinedStepsPolicy<infer Evidence>
    ? Evidence extends Update.DeferredResultEvidence<infer NestedMarker>
      ? BindingMarkers<NestedMarker>
      : never
    : Marker extends DeferredBindingPolicy<string, string>
      ? Marker
      : never

type UnvisitedMarkers<Marker, VisitedPlacements extends string> =
  BindingMarkers<Marker> extends infer BindingMarker
    ? BindingMarker extends DeferredBindingPolicy<infer Placement, string>
      ? Placement extends VisitedPlacements
        ? never
        : BindingMarker
      : never
    : never

type PlacementsOf<Marker> =
  Marker extends DeferredBindingPolicy<infer Placement, string>
    ? Placement
    : never

type DirectPolicyOf<Marker, Children extends ReadonlyArray<unknown>> =
  Marker extends DeferredBindingPolicy<infer Placement, string>
    ? PolicyOfBinding<BindingAt<Children, Placement>>
    : never

type DirectOutputOf<
  Marker,
  Children extends ReadonlyArray<unknown>,
> = Update.ResolvedOperationOutput<
  PolicyFoldReturn<DirectPolicyOf<Marker, Children>>
>

type ReachableBindings<
  Pending,
  Children extends ReadonlyArray<unknown>,
  VisitedPlacements extends string = never,
  Reached = never,
> =
  UnvisitedMarkers<Pending, VisitedPlacements> extends infer Fresh
    ? [Fresh] extends [never]
      ? Reached
      : ReachableBindings<
          MarkersOf<DirectOutputOf<Fresh, Children>>,
          Children,
          VisitedPlacements | PlacementsOf<Fresh>,
          Reached | Fresh
        >
    : never

type ReachableOutMessage<Marker, Children extends ReadonlyArray<unknown>> =
  ReachableBindings<Marker, Children> extends infer Reached
    ?
        | ForwardedOutMessage<DirectPolicyOf<Reached, Children>>
        | OutputOutMessage<DirectOutputOf<Reached, Children>>
    : never

type CombinedChannels<Marker, Children extends ReadonlyArray<unknown>> =
  Marker extends Update.DeferredCombinedStepsPolicy<infer Evidence>
    ? [
        ReachableOutMessage<
          Evidence extends Update.DeferredResultEvidence<infer NestedMarker>
            ? NestedMarker
            : never,
          Children
        >,
      ] extends [never]
      ? EmptyChannels
      : InvalidCombinedStepsChannels
    : EmptyChannels

type DirectChannels<Marker, Children extends ReadonlyArray<unknown>> =
  Marker extends DeferredBindingPolicy<infer Placement, infer ChildId>
    ? DirectOutputOf<Marker, Children> extends infer Output
      ? Readonly<{
          message: CommandMessage<Output>
          outMessage:
            | ForwardedOutMessage<DirectPolicyOf<Marker, Children>>
            | OutputOutMessage<Output>
          requirements: QualifyOwned<
            Placement,
            ChildId,
            Update.RequirementsOfResult<Output>
          >
          registration: Update.RegistrationEvidenceOf<Output>
        }>
      : never
    : EmptyChannels

type ConnectedPolicyChannels<
  Marker,
  Children extends ReadonlyArray<unknown>,
  VisitedPlacements extends string,
  Reached = ReachableBindings<Marker, Children, VisitedPlacements>,
  Channels =
    | DirectChannels<Reached, Children>
    | CombinedChannels<
        Marker | MarkersOf<DirectOutputOf<Reached, Children>>,
        Children
      >,
> = Readonly<{
  message: FieldOf<Channels, 'message'>
  outMessage: FieldOf<Channels, 'outMessage'>
  requirements: FieldOf<Channels, 'requirements'>
  registration: FieldOf<Channels, 'registration'>
}>

type PolicyChannels<
  Marker,
  Children extends ReadonlyArray<unknown>,
  VisitedPlacements extends string,
> =
  Marker extends DeferredBindingPolicy<infer Placement, infer ChildId>
    ? Placement extends VisitedPlacements
      ? EmptyChannels
      : PolicyOfBinding<BindingAt<Children, Placement>> extends infer Policy
        ? Update.ResolvedOperationOutput<
            PolicyFoldReturn<Policy>
          > extends infer Output
          ? [MarkersOf<Output>] extends [never]
            ? Readonly<{
                message: CommandMessage<Output>
                outMessage:
                  | ForwardedOutMessage<Policy>
                  | OutputOutMessage<Output>
                requirements: QualifyOwned<
                  Placement,
                  ChildId,
                  Update.RequirementsOfResult<Output>
                >
                registration: Update.RegistrationEvidenceOf<Output>
              }>
            : ConnectedPolicyChannels<Marker, Children, VisitedPlacements>
          : EmptyChannels
        : EmptyChannels
    : ConnectedPolicyChannels<Marker, Children, VisitedPlacements>

type DeferredChannels<
  Output,
  Children extends ReadonlyArray<unknown>,
  VisitedPlacements extends string,
> = PolicyChannels<MarkersOf<Output>, Children, VisitedPlacements>

/** @internal Detects the impossible registration carried when combineSteps
 * would discard a registered Binding policy's OutMessage. */
export type HasInvalidCombinedStepsRegistration<Evidence> = [
  Extract<Evidence, typeof InvalidCombinedStepsRegistrationEvidenceTypeId>,
] extends [never]
  ? false
  : true

type ResolvedReturn<
  Output,
  Children extends ReadonlyArray<unknown>,
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
                Update.RequirementsOfResult<Output> | PolicyRequirements
              >
            : Update.ReturnWithOutMessage<
                OutputModel<Output>,
                CommandMessage<Output> | PolicyMessage,
                OutputOutMessage<Output> | PolicyOutMessage,
                Update.RequirementsOfResult<Output> | PolicyRequirements
              >,
          Update.RegistrationEvidenceOf<Output> | PolicyRegistration
        >
      : never
    : never

/** @internal Resolves Binding policy channels against a completed graph. */
export type ResolveCompositionOutput<
  Value,
  Children extends ReadonlyArray<unknown>,
  VisitedPlacements extends string = never,
> = [Value] extends [never]
  ? never
  : Update.ResolvedOperationOutput<Value> extends infer Output
    ? Output extends unknown
      ? [Update.DeferredResultEvidenceOf<Output>] extends [never]
        ? Output
        : Output extends Readonly<{ model: unknown }>
          ? ResolvedReturn<Output, Children, VisitedPlacements>
          : Output
      : never
    : never
