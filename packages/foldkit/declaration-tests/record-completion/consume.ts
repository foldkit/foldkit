import type { Effect, Layer } from 'effect'
import type { Block, Update } from 'foldkit'
import { Story } from 'foldkit'

import {
  ContextMessage,
  FamilyModel,
  FamilyProvider,
  FirstBuild,
  FirstBuildFailure,
  HostedHandlerFailure,
  HostedInMessage,
  HostedOutMessage,
  HostedStore,
  ResolvedFamily,
  SecondBuild,
  SecondBuildFailure,
  contextExercise,
  contextSubject,
  familyProviderLayer,
  fullyProvidedImportedRecordLayer,
  hostedExercise,
  hostedHandlers,
  hostedSubject,
  makeFamilyRecordLayer,
  selectedAllHostBranches,
  selectedConditionalRecordLayer,
  selectedHostedEffectLayer,
  selectedHostedRecordLayer,
  selectedImportedRecordLayer,
  selectedImportedViewRecordLayer,
  selectedInlineRecordLayer,
  selectedLocalRecordLayer,
  selectedManualEffectLayer,
} from './accepted.js'
import {
  PrimaryRenderedBinding,
  RenderedChildModel,
  importedRecordView,
  renderedChildView,
} from './view.js'

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
type Assert<Value extends true> = Value

type ChildFailures = FirstBuildFailure | SecondBuildFailure
type ChildServices = FirstBuild | SecondBuild

export type ImportedRecordErrors = Assert<
  Equal<Layer.Error<typeof selectedImportedRecordLayer>, ChildFailures>
>
export type ImportedRecordServices = Assert<
  Equal<Layer.Services<typeof selectedImportedRecordLayer>, ChildServices>
>
export type InlineRecordErrors = Assert<
  Equal<Layer.Error<typeof selectedInlineRecordLayer>, ChildFailures>
>
export type LocalRecordServices = Assert<
  Equal<Layer.Services<typeof selectedLocalRecordLayer>, ChildServices>
>
export type ConditionalRecordErrors = Assert<
  Equal<Layer.Error<typeof selectedConditionalRecordLayer>, ChildFailures>
>
export type ManualEffectServices = Assert<
  Equal<Layer.Services<typeof selectedManualEffectLayer>, ChildServices>
>
export type ImportedViewRecordServices = Assert<
  Equal<Layer.Services<typeof selectedImportedViewRecordLayer>, never>
>
export type FullyProvidedRecordServices = Assert<
  Equal<Layer.Services<typeof fullyProvidedImportedRecordLayer>, never>
>
export type FullyProvidedRecordErrors = Assert<
  Equal<
    Layer.Error<typeof fullyProvidedImportedRecordLayer>,
    FirstBuildFailure | SecondBuildFailure
  >
>

export type HostedHandlerServices = Assert<
  Equal<Layer.Services<typeof hostedHandlers>, HostedStore>
>
export type HostedHandlerError = Assert<
  Equal<Layer.Error<typeof hostedHandlers>, HostedHandlerFailure>
>
export type SelectedRecordHostServices = Assert<
  Equal<Layer.Services<typeof selectedHostedRecordLayer>, never>
>
export type SelectedEffectHostServices = Assert<
  Equal<Layer.Services<typeof selectedHostedEffectLayer>, never>
>

type SelectedFacts<LayerValue extends Layer.Any> =
  Extract<
    Layer.Success<LayerValue>,
    Block.ImplementationFacts<unknown, unknown, unknown>
  > extends Block.ImplementationFacts<unknown, infer Facts, unknown>
    ? Facts
    : never

type SelectedPending<LayerValue extends Layer.Any> =
  Extract<
    Layer.Success<LayerValue>,
    Block.ImplementationFacts<unknown, unknown, unknown>
  > extends Block.ImplementationFacts<unknown, unknown, infer Pending>
    ? Pending
    : never

type SelectedRecordFacts = SelectedFacts<typeof selectedHostedRecordLayer>
type SelectedEffectFacts = SelectedFacts<typeof selectedHostedEffectLayer>
type SelectedAllBranchFacts = SelectedFacts<typeof selectedAllHostBranches>

export type SelectedRecordHostRequirements = Assert<
  Equal<SelectedRecordFacts['effectsLayerRequirements'], HostedStore>
>
export type SelectedRecordHostErrors = Assert<
  Equal<SelectedRecordFacts['effectsLayerError'], HostedHandlerFailure>
>
export type SelectedRecordProgramRequirements = Assert<
  Equal<SelectedRecordFacts['programRequirements'], HostedStore>
>
export type SelectedRecordHostRequirementsResolved = Assert<
  Equal<SelectedRecordFacts['hostRequirements'], never>
>
export type SelectedEffectHostRequirements = Assert<
  Equal<SelectedEffectFacts['effectsLayerRequirements'], HostedStore>
>
export type SelectedEffectHostErrors = Assert<
  Equal<SelectedEffectFacts['effectsLayerError'], HostedHandlerFailure>
>
export type SelectedEffectProgramRequirements = Assert<
  Equal<SelectedEffectFacts['programRequirements'], HostedStore>
>
export type SelectedEffectHostRequirementsResolved = Assert<
  Equal<SelectedEffectFacts['hostRequirements'], never>
>
export type SelectedAllBranchHostRequirements = Assert<
  Equal<SelectedAllBranchFacts['effectsLayerRequirements'], HostedStore>
>
export type SelectedAllBranchHostErrors = Assert<
  Equal<SelectedAllBranchFacts['effectsLayerError'], HostedHandlerFailure>
>
export type SelectedRecordHasNoPendingHandlers = Assert<
  Equal<SelectedPending<typeof selectedHostedRecordLayer>, never>
>
export type SelectedEffectHasNoPendingHandlers = Assert<
  Equal<SelectedPending<typeof selectedHostedEffectLayer>, never>
>
export type FamilyRecordServices = Assert<
  Equal<Layer.Services<ReturnType<typeof makeFamilyRecordLayer>>, never>
>
export type FamilyRecordErrors = Assert<
  Equal<Layer.Error<ReturnType<typeof makeFamilyRecordLayer>>, never>
>
export type FamilyProviderService = Assert<
  Equal<Layer.Success<typeof familyProviderLayer>, FamilyProvider>
>
export type FamilyModelContract = Assert<
  Equal<typeof ResolvedFamily.Model.Type, FamilyModel>
>
export const familyValue: string = ResolvedFamily.readValue(
  FamilyModel.make({ value: 'relocated' }),
)

export const relocatedImportedView = importedRecordView
export const relocatedChildEmbedding = PrimaryRenderedBinding.embedView({
  slotId: 'relocated-primary',
  model: RenderedChildModel.make({ value: 'relocated' }),
  view: renderedChildView,
  viewInputs: { label: 'Relocated' },
})

PrimaryRenderedBinding.embedView({
  slotId: 'invalid-relocated-inputs',
  model: RenderedChildModel.make({ value: 'relocated' }),
  view: renderedChildView,
  // @ts-expect-error Extracted child view inputs remain exact after relocation.
  viewInputs: { label: 1 },
})

type ContextResult = Effect.Success<typeof contextExercise>
export type ExactContextModel = Assert<
  Equal<ContextResult['model'], Readonly<{ count: number }>>
>
export type ContextHasNoRegistration = Assert<
  Equal<Update.RegistrationEvidenceOf<ContextResult>, never>
>

type HostedResult = Effect.Success<typeof hostedExercise>
export type ExactHostedOutMessage = Assert<
  Equal<
    Exclude<HostedResult['outMessage'], undefined>,
    typeof HostedOutMessage.ChangedCount.Type
  >
>

export const relocatedContext = Story.withBlock(contextSubject, executable => {
  const initialized = executable.init()
  const defaulted = executable.update(
    initialized.model,
    ContextMessage.ClickedIncrement(),
  )

  // @ts-expect-error Init's optional prefix remains numeric after relocation.
  executable.init('wrong')
  // @ts-expect-error Init's rest arguments remain strings after relocation.
  executable.init(1, 2)
  // @ts-expect-error Update's optional context remains numeric after relocation.
  executable.update(defaulted.model, ContextMessage.ClickedIncrement(), 'wrong')
  // @ts-expect-error Update's rest context remains strings after relocation.
  executable.update(defaulted.model, ContextMessage.ClickedIncrement(), 1, 2)

  return executable.update(
    defaulted.model,
    ContextMessage.ClickedIncrement(),
    2,
    'relocated',
  )
})

export const relocatedHosted = Story.withBlock(hostedSubject, executable => {
  const initialized = executable.init()
  const reported = executable.inMessageUpdate(
    initialized.model,
    HostedInMessage.RequestedReport({ value: 3 }),
  )

  executable.inMessageUpdate(
    reported.model,
    // @ts-expect-error InMessage payload precision survives relocation.
    HostedInMessage.RequestedSet({ value: 'wrong' }),
  )

  return reported
})

export type ExactHostedInMessage = Assert<
  Equal<
    Block.ExecutableOf<typeof hostedSubject.block>['InMessage'],
    typeof HostedInMessage
  >
>
