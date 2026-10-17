import { Schema } from 'effect'
import { Block, Message, Update } from 'foldkit'
import type { Command } from 'foldkit/command'

export const ChildModel = Schema.Struct({ value: Schema.Number })
export const ChildMessage = Message.defineMessageUnion({
  UpdatedValue: { value: Schema.Number },
})
const DeclarationCanonicalConstructorChild = Block.define(
  'DeclarationCanonicalConstructorChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
)
const DeclarationCanonicalConstructorChildComposition =
  DeclarationCanonicalConstructorChild.makeComposition()
export const ChildBlock =
  DeclarationCanonicalConstructorChildComposition.makeBlock({
    init: DeclarationCanonicalConstructorChildComposition.makeInit(() => ({
      model: ChildModel.make({ value: 0 }),
    })),
    update: DeclarationCanonicalConstructorChildComposition.makeUpdate(
      model => ({
        model,
      }),
    ),
  })
const ParentModel = Schema.Struct({ child: ChildModel })
declare const PayloadWithUnknownDecodingServices: Schema.Codec<
  string,
  string,
  unknown,
  never
>
export const ParentMessage = Message.defineMessageUnion({
  GotChildMessage: { message: ChildBlock.Message },
  GotOtherMessage: { message: ChildBlock.Message },
  GotExtraMessage: { message: ChildBlock.Message, extra: Schema.String },
  GotOptionalExtraMessage: {
    message: ChildBlock.Message,
    extra: Schema.optionalKey(Schema.String),
  },
  // oxlint-disable-next-line foldkit/got-prefix-requires-block-payload -- This fixture preserves an invalid wrapper contract.
  GotWrongMessage: { message: Schema.String },
  ReceivedPayload: { payload: PayloadWithUnknownDecodingServices },
})
export const DeclarationCanonicalConstructorParent = Block.define(
  'DeclarationCanonicalConstructorParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)
export const CanonicalBinding = DeclarationCanonicalConstructorParent.bindChild(
  ChildBlock,
  {
    field: 'child',
    parentMessage: ParentMessage.GotChildMessage,
  },
)
export const MappedBinding = DeclarationCanonicalConstructorParent.bindChild(
  ChildBlock,
  {
    field: 'child',
    toParentMessage: message => ParentMessage.GotOtherMessage({ message }),
    fromParentMessage: false,
  },
)

declare const distinctSchemaMapper: typeof ChildMessage.UpdatedValue &
  ((
    message: typeof ChildMessage.Type,
  ) => typeof ParentMessage.GotOtherMessage.Type)

export const DistinctSchemaMapperBinding =
  DeclarationCanonicalConstructorParent.bindChild(ChildBlock, {
    field: 'child',
    toParentMessage: distinctSchemaMapper,
    fromParentMessage: false,
  })

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
    typeof ParentMessage.GotChildMessage.Type
  >
>
export type MappedMessageIsExact = Expect<
  Equal<
    CommandMessageOf<ReturnType<typeof MappedBinding.fold>>,
    typeof ParentMessage.GotOtherMessage.Type
  >
>
export type DistinctSchemaMapperReturnIsPreserved = Expect<
  Equal<
    CommandMessageOf<ReturnType<typeof DistinctSchemaMapperBinding.fold>>,
    typeof ParentMessage.GotOtherMessage.Type
  >
>
export type CanonicalRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof CanonicalBinding.fold>>,
    Block.RequirementOfBinding<typeof CanonicalBinding>
  >
>
