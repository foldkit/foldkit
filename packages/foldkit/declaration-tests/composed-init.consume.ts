import type { Layer } from 'effect'
import type { Update } from 'foldkit'

import {
  ChildBinding,
  ComposedInitBlock,
  Model,
  init,
  prepareTogetherStep,
} from './composed-init.accepted.js'
import {
  CountStore,
  PreparationFailure,
} from './generated-dispatch.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type EmittedArguments = Expect<
  Equal<Parameters<typeof init>, [isReady: boolean]>
>
export type EmittedModel = Expect<
  Equal<ReturnType<typeof init>['model'], typeof Model.Type>
>
export type EmittedServices = Expect<
  Equal<Layer.Services<typeof ComposedInitBlock.EffectsLayer>, CountStore>
>
export type EmittedConstructorError = Expect<
  Equal<Layer.Error<typeof ComposedInitBlock.EffectsLayer>, PreparationFailure>
>
export type EmittedStepRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof prepareTogetherStep>,
    Update.RequirementsOf<typeof init>
  >
>
export type EmittedRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof init>>,
    Update.RegistrationEvidenceOf<
      ReturnType<ReturnType<typeof ChildBinding.requestReadCount>>
    >
  >
>
