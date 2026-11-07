import { Schema } from 'effect'
import { Block, Message, Update } from 'foldkit'
import type { Command } from 'foldkit/command'

export const ChildModel = Schema.Struct({ value: Schema.Number })
export const ChildMessage = Message.defineMessageUnion({
  UpdatedValue: { value: Schema.Number },
})

const DeclarationCanonicalConstructorChildComposition = Block.makeDefinition(
  'DeclarationCanonicalConstructorChild',
  { Model: ChildModel, Message: ChildMessage },
).makeComposition()
const prepareChildBlock = () =>
  DeclarationCanonicalConstructorChildComposition.prepareBlock({
    init: DeclarationCanonicalConstructorChildComposition.makeInit(() => ({
      model: ChildModel.make({ value: 0 }),
    })),
    update: DeclarationCanonicalConstructorChildComposition.makeUpdate({
      UpdatedValue: model => ({
        model,
      }),
    }),
  })
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)
const ParentModel = Schema.Struct({ child: ChildModel })
export const Payload = Schema.String.pipe(
  Schema.brand('DeclarationCanonicalConstructorPayload'),
)
export const ParentMessage = Message.defineMessageUnion({
  ReceivedPayload: { payload: Payload },
})
export const DeclarationCanonicalConstructorParentDefinition =
  Block.makeDefinition('DeclarationCanonicalConstructorParent', {
    Model: ParentModel,
    Message: ParentMessage,
  })
export const CanonicalBinding =
  DeclarationCanonicalConstructorParentDefinition.makeRequiredFieldBinding(
    ChildBlock,
    {
      field: 'child',
    },
  )
export const AlternativeBinding =
  DeclarationCanonicalConstructorParentDefinition.makeRequiredFieldBinding(
    ChildBlock,
    {
      field: 'child',
      placement: 'other',
    },
  )
export const DeclarationCanonicalConstructorParentComposition =
  DeclarationCanonicalConstructorParentDefinition.makeComposition({
    bindings: [CanonicalBinding],
  })

export type ExpectedEnvelope = Readonly<{
  _tag: 'GotChildMessage'
  placement: 'child'
  generation: number
  message: typeof ChildMessage.Type
}>

export type ExpectedAlternativeEnvelope = Readonly<{
  _tag: 'GotOtherMessage'
  placement: 'other'
  generation: number
  message: typeof ChildMessage.Type
}>

type CommandMessageOf<Output> =
  Output extends Update.ResultRecipe<
    infer _Model,
    infer ReturnedMessage,
    infer _OutMessage,
    infer _Requirements,
    infer _Evidence
  >
    ? ReturnedMessage
    : Output extends Readonly<{
          commands?:
            | ReadonlyArray<
                Command<infer ReturnedMessage, never, infer _Requirements>
              >
            | undefined
        }>
      ? ReturnedMessage
      : never

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

type Expect<Value extends true> = Value

export type CanonicalMessageIsExact = Expect<
  Equal<
    CommandMessageOf<ReturnType<typeof CanonicalBinding.fold>>,
    ExpectedEnvelope
  >
>
export type AlternativePlacementMessageIsExact = Expect<
  Equal<
    CommandMessageOf<ReturnType<typeof AlternativeBinding.fold>>,
    ExpectedAlternativeEnvelope
  >
>
export type CanonicalRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof CanonicalBinding.fold>>,
    Block.RequirementOfBinding<typeof CanonicalBinding>
  >
>
export type LocalConstructorIsRetained = Expect<
  Equal<
    typeof DeclarationCanonicalConstructorParentComposition.Message.ReceivedPayload,
    typeof ParentMessage.ReceivedPayload
  >
>
export type CompleteMessageIsExact = Expect<
  Equal<
    typeof DeclarationCanonicalConstructorParentComposition.Message.Type,
    typeof ParentMessage.Type | ExpectedEnvelope
  >
>
export type CompleteDecodingServicesAreSelfContained = Expect<
  Equal<
    typeof DeclarationCanonicalConstructorParentComposition.Message.DecodingServices,
    never
  >
>
export type CompleteEncodingServicesAreSelfContained = Expect<
  Equal<
    typeof DeclarationCanonicalConstructorParentComposition.Message.EncodingServices,
    never
  >
>
