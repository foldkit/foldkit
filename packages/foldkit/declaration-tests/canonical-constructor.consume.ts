import { Block, Update } from 'foldkit'
import type { Command } from 'foldkit/command'

import {
  CanonicalBinding,
  DistinctSchemaMapperBinding,
  MappedBinding,
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
