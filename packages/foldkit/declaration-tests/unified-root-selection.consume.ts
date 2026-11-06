import { Effect, Layer, type Scope } from 'effect'
import { Program } from 'foldkit'
import * as Block from 'foldkit/block'
import type * as Server from 'foldkit/experimental/server'
import type { TestEffect } from 'foldkit/story'

import {
  Setup,
  SetupFailure,
  explicitUnionCallbackService,
  inspectMergedRoot,
  inspectSameBlockLayerUnion,
  inspectSetup,
  readFirstChild,
  renderSamePageLayerUnion,
  renderSetup,
  sceneSameBlockLayerUnion,
  sceneSetup,
  simpleSetup,
  storySameBlockLayerUnion,
  storySetup,
  suppliedCallbackService,
  withSetupService,
} from './unified-root-selection.accepted.js'

export const relocatedKeyedChildDelivery = readFirstChild
import {
  SessionBlock,
  type SessionService,
  Store,
  StoreLayer,
  makeDifferentKeysProgram,
  makeExplicitLayerUnionProgram,
  makePageResourceUnionProgram,
  makeRegisteredUnionProgram,
  makeResourceUnionProgram,
  makeStoreUnionProgram,
  otherRegistered,
  registered,
} from './unified-root-selection.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false
type Expect<Value extends true> = Value
type RequirementsOf<ProgramValue> =
  ProgramValue extends Readonly<{
    '~foldkit/ProgramProvision'?: Readonly<{
      Requirements: (requirements: infer Requirements) => unknown
    }>
  }>
    ? Requirements
    : never
type RuntimeServicesOf<ProgramValue> =
  ProgramValue extends Readonly<{
    '~foldkit/ProgramProvision'?: Readonly<{
      RuntimeServices: (services: infer Services) => unknown
    }>
  }>
    ? Services
    : never
type RootCapability = Block.RuntimeCapability<typeof SessionBlock.owner>
export type ExactResourceRequirement = Expect<
  Equal<
    RequirementsOf<ReturnType<typeof makeResourceUnionProgram>>,
    SessionService
  >
>
export type ExactResourceGuarantee = Expect<
  Equal<
    RuntimeServicesOf<ReturnType<typeof makeResourceUnionProgram>>,
    RootCapability
  >
>
export type ExactRegisteredRequirement = Expect<
  Equal<RequirementsOf<ReturnType<typeof makeRegisteredUnionProgram>>, never>
>
export type ExactRegisteredGuarantee = Expect<
  Equal<
    RuntimeServicesOf<ReturnType<typeof makeRegisteredUnionProgram>>,
    SessionService | RootCapability
  >
>
export type ExactStoreRequirement = Expect<
  Equal<RequirementsOf<ReturnType<typeof makeStoreUnionProgram>>, Store>
>
export type ExplicitLayerUnionKeepsRequirement = Expect<
  Equal<
    RequirementsOf<ReturnType<typeof makeExplicitLayerUnionProgram>>,
    SessionService
  >
>
export type PageUnionKeepsRequirement = Expect<
  Equal<RequirementsOf<ReturnType<typeof makePageResourceUnionProgram>>, never>
>
export type DifferentKeysKeepRequirement = Expect<
  Equal<RequirementsOf<ReturnType<typeof makeDifferentKeysProgram>>, never>
>
export const startOrdinaryStoreUnion = (
  selection: Parameters<typeof makeStoreUnionProgram>[0],
) => makeStoreUnionProgram(selection).provide(StoreLayer).start
export const startDifferentKeys = (
  selection: typeof registered | typeof otherRegistered,
) =>
  Program.makeElement({ ...selection, container: null }).provide(Layer.empty)
    .start

export type WithBlockRetainsSetupError = Expect<
  Equal<Effect.Error<ReturnType<typeof inspectSetup>>, SetupFailure>
>
export type WithBlockRetainsSetupService = Expect<
  Equal<Effect.Services<ReturnType<typeof inspectSetup>>, Setup>
>
export type StoryRetainsSetupError = Expect<
  Equal<Effect.Error<ReturnType<typeof storySetup>>, SetupFailure>
>
export type StoryRetainsSetupService = Expect<
  Equal<Effect.Services<ReturnType<typeof storySetup>>, Setup>
>
export type SceneRetainsSetupError = Expect<
  Equal<Effect.Error<ReturnType<typeof sceneSetup>>, SetupFailure>
>
export type SceneRetainsSetupService = Expect<
  Equal<Effect.Services<ReturnType<typeof sceneSetup>>, Setup>
>
export type ServerRetainsSetupError = Expect<
  Equal<
    Effect.Error<ReturnType<typeof renderSetup>>,
    Server.RenderError | SetupFailure
  >
>
export type ServerRetainsSetupService = Expect<
  Equal<Effect.Services<ReturnType<typeof renderSetup>>, Setup>
>

export type ExplicitCallbackNeedsService = Expect<
  Equal<Effect.Services<ReturnType<typeof explicitUnionCallbackService>>, Setup>
>
export type SuppliedCallbackNeedsNoService = Expect<
  Equal<Effect.Services<ReturnType<typeof suppliedCallbackService>>, never>
>
export type CallbackUtilityRetainsService = Expect<
  Equal<
    Effect.Services<
      TestEffect<
        typeof simpleSetup | typeof withSetupService,
        Effect.Effect<void, never, Setup>
      >
    >,
    Setup
  >
>

type ScopedCallback = TestEffect<
  typeof simpleSetup | typeof withSetupService,
  Effect.Effect<number, SetupFailure, Setup | Scope.Scope>
>
export type CallbackUtilityRetainsValue = Expect<
  Equal<Effect.Success<ScopedCallback>, number>
>
export type CallbackUtilityRetainsError = Expect<
  Equal<Effect.Error<ScopedCallback>, SetupFailure>
>
export type CallbackUtilityClosesScope = Expect<
  Equal<Effect.Services<ScopedCallback>, Setup>
>

export type SameBlockAcquisitionKeepsError = Expect<
  Equal<
    Effect.Error<ReturnType<typeof inspectSameBlockLayerUnion>>,
    SetupFailure
  >
>
export type SameBlockAcquisitionKeepsService = Expect<
  Equal<Effect.Services<ReturnType<typeof inspectSameBlockLayerUnion>>, Setup>
>
export type SameBlockStoryKeepsError = Expect<
  Equal<Effect.Error<ReturnType<typeof storySameBlockLayerUnion>>, SetupFailure>
>
export type SameBlockStoryKeepsService = Expect<
  Equal<Effect.Services<ReturnType<typeof storySameBlockLayerUnion>>, Setup>
>
export type SameBlockSceneKeepsError = Expect<
  Equal<Effect.Error<ReturnType<typeof sceneSameBlockLayerUnion>>, SetupFailure>
>
export type SameBlockSceneKeepsService = Expect<
  Equal<Effect.Services<ReturnType<typeof sceneSameBlockLayerUnion>>, Setup>
>
export type SamePageServerKeepsError = Expect<
  Equal<
    Effect.Error<ReturnType<typeof renderSamePageLayerUnion>>,
    Server.RenderError | SetupFailure
  >
>
export type SamePageServerKeepsService = Expect<
  Equal<Effect.Services<ReturnType<typeof renderSamePageLayerUnion>>, Setup>
>
export type MergedLayerSuppliesUnrelatedService = Expect<
  Equal<Effect.Services<ReturnType<typeof inspectMergedRoot>>, never>
>
