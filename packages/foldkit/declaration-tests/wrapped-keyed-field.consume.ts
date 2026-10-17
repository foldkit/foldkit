import { Layer, Schema } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  Choice,
  ChoiceBuildFailure,
  ChoiceEntry,
  ChoiceId,
  ChoiceService,
  ChoicesBinding,
  DeclarationWrappedKeyedFieldParent,
  DeclarationWrappedKeyedFieldParentComposition,
  GeneralChoicesBinding,
  GeneralExtractedPolicyChoicesBinding,
  InitializedChoicesBinding,
  LiteralChoicesBinding,
  LiteralInitializedChoicesBinding,
  ParentMessage,
  ParentModel,
  PlainChoiceBlock,
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
  toChoiceMessage,
  unassembledInitialize,
} from './wrapped-keyed-field.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

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
  Equal<typeof ChoicesBinding.placement, 'choices'>
>
export type PlainPlacement = Expect<
  Equal<typeof PlainChoicesBinding.placement, 'plainChoices'>
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
        Block.BindingRequirement<'choices', typeof Choice.block>
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
      typeof ParentMessage.Type,
      never,
      never,
      Block.BindingRequirement<'choices', typeof Choice.block>
    >
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
  Equal<typeof InitializedChoicesBinding.placement, 'choices'>
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
    Block.Qualify<'choices', Command.HandlerOf<typeof Choice.ReadChoice>>
  >
>
export type Registration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof ChoicesBinding.fold>>,
    Block.BindingRequirement<'choices', typeof Choice.block>
  >
>
export type RefreshRequirements = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof ChoicesBinding.refresh>>,
    Block.Scoped<'choices', Command.HandlerOf<typeof Choice.ReadChoice>>
  >
>
export type PolicyRequirements = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof ChoicesBinding.select>>,
    Block.Scoped<'choices', Command.HandlerOf<typeof Choice.ReadChoice>>
  >
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
        Block.BindingRequirement<'entries', typeof PlainChoiceBlock>
      >
  >
>

const choiceExecutionMessage = ParentMessage.GotTextMessage({
  id: 'text',
  message: TextMessage.ReplacedText({ value: 'unchanged' }),
})
const otherExecutionMessage = ParentMessage.GotChoiceMessage({
  id: firstChoiceId,
  message: Choice.Message.UpdatedValue({ value: 'One' }),
})

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

// @ts-expect-error Emitted wrapped keyed policies must accept every collection key.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, { field: 'choices', key: 'id', childField: 'choice', toParentMessage: toChoiceMessage, fromParentMessage: false, outMessage: { fold: (_key: 'other', _outMessage: typeof Choice.OutMessage.Type) => DeclarationWrappedKeyedFieldParent.step(model => ({ model })) } })

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
  Equal<
    Update.RequirementsOf<ReturnType<typeof GeneralChoicesBinding.select>>,
    Block.Scoped<'generalChoices', Command.HandlerOf<typeof Choice.ReadChoice>>
  >
>
export type GeneralExtractedPolicyRequirements = Expect<
  Equal<
    Update.RequirementsOf<
      ReturnType<typeof GeneralExtractedPolicyChoicesBinding.select>
    >,
    Block.Scoped<
      'generalExtractedPolicyChoices',
      Command.HandlerOf<typeof Choice.ReadChoice>
    >
  >
>
export type GeneralRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof GeneralChoicesBinding.fold>
    >,
    Block.BindingRequirement<'generalChoices', typeof Choice.block>
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
