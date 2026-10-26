import { Layer, Schema } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  Choice,
  ChoiceBuildFailure,
  ChoiceEntry,
  ChoiceId,
  ChoiceService,
  ChoicesBinding,
  DeclarationWrappedKeyedFieldParentComposition,
  DeclarationWrappedKeyedFieldParentDefinition,
  GeneralChoicesBinding,
  GeneralExtractedPolicyChoicesBinding,
  InitializedChoicesBinding,
  LiteralChoicesBinding,
  LiteralInitializedChoicesBinding,
  ParentMessage,
  ParentModel,
  PlainChoicesBinding,
  TextMessage,
  choiceInspection,
  firstChoiceId,
  foldChoice,
  foldTextEntry,
  initialParentModel,
  initialize,
  makePayloadParent,
  payloadParent,
  refreshChoice,
  selectChoice,
  setChoiceValue,
  setLiteralChoiceValue,
  unassembledInitialize,
} from './wrapped-keyed-field.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type ExactRequirements<Actual, Expected> = 0 extends 1 & Actual
  ? false
  : unknown extends Actual
    ? false
    : [Actual] extends [Expected]
      ? [Expected] extends [Actual]
        ? true
        : false
      : false

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

type ChoiceEnvelope = KeyedEnvelope<
  'GotDeclarationWrappedKeyedFieldChoiceMessage',
  'DeclarationWrappedKeyedFieldChoice',
  typeof ChoiceId.Type,
  typeof Choice.Message.Type
>

export type Key = Expect<
  Equal<Parameters<typeof ChoicesBinding.fold>[1], typeof ChoiceId.Type>
>
export type LiteralKey = Expect<
  Equal<
    Parameters<typeof LiteralChoicesBinding.fold>[1],
    'Primary' | 'Secondary'
  >
>
export type Placement = Expect<
  Equal<typeof ChoicesBinding.placement, 'DeclarationWrappedKeyedFieldChoice'>
>
export type PlainPlacement = Expect<
  Equal<
    typeof PlainChoicesBinding.placement,
    'DeclarationWrappedKeyedFieldPlainChoice'
  >
>
export type LiteralPlacement = Expect<
  Equal<typeof LiteralChoicesBinding.placement, 'literalChoices'>
>
export type ParentModelInput = Expect<
  Equal<
    Parameters<typeof ChoicesBinding.fold>[0],
    typeof ParentModel.Type &
      Update.GraphCapability<
        typeof ParentModel.Type,
        Block.RequirementOfBinding<typeof ChoicesBinding>
      >
  >
>
export type ChildMessage = Expect<
  Equal<Parameters<typeof ChoicesBinding.fold>[2], typeof Choice.Message.Type>
>
export type RefinedMessagePayload = Expect<
  Equal<
    Extract<
      Parameters<typeof ChoicesBinding.fold>[2],
      Readonly<{ _tag: 'UpdatedValue' }>
    >['value'],
    'One' | 'Two'
  >
>
export type RefinedOutMessagePayload = Expect<
  Equal<
    Extract<
      typeof Choice.OutMessage.Type,
      Readonly<{ _tag: 'SelectedValue' }>
    >['value'],
    'One' | 'Two'
  >
>
export type FoldModel = Expect<
  Equal<
    ReturnType<typeof ChoicesBinding.fold>,
    Update.ResultRecipe<
      typeof ParentModel.Type,
      ChoiceEnvelope,
      never,
      Block.Scoped<
        'DeclarationWrappedKeyedFieldChoice',
        Command.HandlerOf<typeof Choice.ReadChoice>
      >,
      | Block.RequirementOfBinding<typeof ChoicesBinding>
      | Update.DeferredResultEvidence<
          Block.DeferredBindingPolicy<
            'DeclarationWrappedKeyedFieldChoice',
            'DeclarationWrappedKeyedFieldChoice'
          >
        >
    >
  >
>

type CompleteDispatch =
  | typeof ParentMessage.Type
  | ChoiceEnvelope
  | KeyedEnvelope<
      'GotLiteralChoicesMessage',
      'literalChoices',
      'Primary' | 'Secondary',
      typeof Choice.Message.Type
    >
  | KeyedEnvelope<
      'GotDeclarationWrappedKeyedFieldTextMessage',
      'DeclarationWrappedKeyedFieldText',
      string,
      typeof TextMessage.Type
    >

type CompleteEncodedDispatch =
  | typeof ParentMessage.Encoded
  | KeyedEnvelope<
      'GotDeclarationWrappedKeyedFieldChoiceMessage',
      'DeclarationWrappedKeyedFieldChoice',
      typeof ChoiceId.Encoded,
      typeof Choice.Message.Encoded
    >
  | KeyedEnvelope<
      'GotLiteralChoicesMessage',
      'literalChoices',
      'Primary' | 'Secondary',
      typeof Choice.Message.Encoded
    >
  | KeyedEnvelope<
      'GotDeclarationWrappedKeyedFieldTextMessage',
      'DeclarationWrappedKeyedFieldText',
      string,
      typeof TextMessage.Encoded
    >

export type CompleteDispatchType = Expect<
  Equal<
    typeof DeclarationWrappedKeyedFieldParentComposition.Message.Type,
    CompleteDispatch
  >
>
export type CompleteDispatchEncoded = Expect<
  Equal<
    typeof DeclarationWrappedKeyedFieldParentComposition.Message.Encoded,
    CompleteEncodedDispatch
  >
>
export type CompleteDispatchDecodingServices = Expect<
  Equal<
    typeof DeclarationWrappedKeyedFieldParentComposition.Message.DecodingServices,
    never
  >
>
export type CompleteDispatchEncodingServices = Expect<
  Equal<
    typeof DeclarationWrappedKeyedFieldParentComposition.Message.EncodingServices,
    never
  >
>
export type GenericPayload = Expect<
  Equal<
    (typeof payloadParent.Model.Type)['entries'][number]['payload'],
    Readonly<{ label: string }>
  >
>
export type GenericPayloadKey = Expect<
  Equal<Parameters<typeof payloadParent.Binding.fold>[1], typeof ChoiceId.Type>
>
export type SetValueArgs = Expect<
  Equal<
    Parameters<typeof ChoicesBinding.setValue>,
    [key: typeof ChoiceId.Type, value: 'One' | 'Two']
  >
>
export type RefreshArgs = Expect<
  Equal<Parameters<typeof ChoicesBinding.refresh>, [key: typeof ChoiceId.Type]>
>
export type InitConfig = Parameters<typeof ChoicesBinding.init>[0]
export type InitKey = Expect<Equal<InitConfig['key'], typeof ChoiceId.Type>>
export type InitArgs = Expect<Equal<InitConfig['args'], [value: 'One' | 'Two']>>
export type InitializedPlacement = Expect<
  Equal<
    typeof InitializedChoicesBinding.placement,
    'DeclarationWrappedKeyedFieldChoice'
  >
>
export type InitializeArguments = Expect<
  Equal<
    Parameters<typeof initialize>,
    [
      context: Readonly<{
        id: typeof ChoiceId.Type
        value: 'One' | 'Two'
      }>,
    ]
  >
>
export type InitializeRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof initialize>,
    Block.Qualify<
      'DeclarationWrappedKeyedFieldChoice',
      Command.HandlerOf<typeof Choice.ReadChoice>
    >
  >
>
export type Registration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof ChoicesBinding.fold>>,
    Block.RequirementOfBinding<typeof ChoicesBinding>
  >
>
export type RefreshRequirements = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof ChoicesBinding.refresh>>,
    Block.Scoped<
      'DeclarationWrappedKeyedFieldChoice',
      Command.HandlerOf<typeof Choice.ReadChoice>
    >
  >
>
export type PolicyRequirements = Expect<
  Equal<Update.RequirementsOf<ReturnType<typeof ChoicesBinding.select>>, never>
>
export type InspectionServices = Expect<
  Equal<Layer.Services<typeof choiceInspection.EffectsLayer>, ChoiceService>
>
export type InspectionError = Expect<
  Equal<Layer.Error<typeof choiceInspection.EffectsLayer>, ChoiceBuildFailure>
>
export type Builder = Block.ViewBuilderFor<
  typeof DeclarationWrappedKeyedFieldParentComposition
>

const initialized = initialize({ id: firstChoiceId, value: 'Two' })
export type InitializedModel = Expect<
  Equal<typeof initialized.model, typeof ParentModel.Type>
>

const literalPayloadParent = makePayloadParent(
  Schema.Literals(['Primary', 'Secondary']),
)
export type EmittedGenericPayload = Expect<
  Equal<
    (typeof literalPayloadParent.Model.Type)['entries'][number]['payload'],
    'Primary' | 'Secondary'
  >
>
export type EmittedGenericParentModel = Expect<
  Equal<
    Parameters<typeof literalPayloadParent.Binding.fold>[0],
    typeof literalPayloadParent.Model.Type &
      Update.GraphCapability<
        typeof literalPayloadParent.Model.Type,
        Block.RequirementOfBinding<typeof literalPayloadParent.Binding>
      >
  >
>

const choiceExecutionMessage = ParentMessage.IgnoredChildMessage()
const otherExecutionMessage = ParentMessage.IgnoredChildMessage()

foldChoice(
  initialParentModel,
  choiceExecutionMessage,
  firstChoiceId,
  Choice.Message.UpdatedValue({ value: 'Two' }),
)
setChoiceValue(initialParentModel, choiceExecutionMessage, firstChoiceId, 'One')
refreshChoice(initialParentModel, choiceExecutionMessage, firstChoiceId)
selectChoice(initialParentModel, choiceExecutionMessage, firstChoiceId)
setLiteralChoiceValue(
  initialParentModel,
  otherExecutionMessage,
  'Secondary',
  'Two',
)
foldTextEntry(
  initialParentModel,
  otherExecutionMessage,
  'text',
  TextMessage.ReplacedText({ value: 'next' }),
)

const generatedChoiceDelivery = Schema.decodeSync(
  DeclarationWrappedKeyedFieldParentComposition.Message,
)({
  _tag: 'GotDeclarationWrappedKeyedFieldChoiceMessage',
  placement: 'DeclarationWrappedKeyedFieldChoice',
  generation: 0,
  key: firstChoiceId,
  message: Choice.Message.UpdatedValue({ value: 'Two' }),
})
void generatedChoiceDelivery

// @ts-expect-error Emitted wrapped keyed policies must accept every collection key.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, { field: 'choices', key: 'id', childField: 'choice', }).withOutMessagePolicy({ fold: (_key: 'other', _outMessage: typeof Choice.OutMessage.Type) => DeclarationWrappedKeyedFieldParentDefinition.makeStep(model => ({ model })) })

// @ts-expect-error Emitted wrapped Bindings preserve branded keys.
ChoicesBinding.refresh('first')
// @ts-expect-error Emitted wrapped Bindings preserve refined exposed arguments.
ChoicesBinding.setValue(firstChoiceId, 'Three')
// @ts-expect-error Emitted wrapped Bindings preserve literal keys.
LiteralChoicesBinding.select('Tertiary')

export type LiteralInitializedPlacement = Expect<
  Equal<
    typeof LiteralInitializedChoicesBinding.placement,
    'literalInitializedChoices'
  >
>
export type GeneralKey = Expect<
  Equal<Parameters<typeof GeneralChoicesBinding.fold>[1], typeof ChoiceId.Type>
>
export type GeneralPolicyRequirements = Expect<
  ExactRequirements<
    Update.RequirementsOf<ReturnType<typeof GeneralChoicesBinding.select>>,
    never
  >
>
export type GeneralExtractedPolicyRequirements = Expect<
  ExactRequirements<
    Update.RequirementsOf<
      ReturnType<typeof GeneralExtractedPolicyChoicesBinding.select>
    >,
    never
  >
>
export type GeneralRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof GeneralChoicesBinding.fold>
    >,
    Block.RequirementOfBinding<typeof GeneralChoicesBinding>
  >
>

export type InitializedSiblingModel = Expect<
  Equal<
    (typeof initialized.model)['plainChoices'][number],
    typeof ChoiceEntry.Type
  >
>
export type UnassembledModelRemainsExact = Expect<
  Equal<
    ReturnType<typeof unassembledInitialize>['model']['choices'],
    Array<never>
  >
>
