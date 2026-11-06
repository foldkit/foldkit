import { Block, Update } from 'foldkit'
import type { Command } from 'foldkit/command'

import {
  AlternativeBinding,
  CanonicalBinding,
  DeclarationCanonicalConstructorParentComposition,
  type ExpectedAlternativeEnvelope,
  type ExpectedEnvelope,
  ParentMessage,
} from './canonical-constructor.accepted.js'

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
