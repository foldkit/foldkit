import { Layer } from 'effect'
import { Block, Command, Update } from 'foldkit'

import {
  Application,
  AutomaticBinding,
  ChildBlock,
  DeclarationStartupDefaultsParent,
  DeclarationStartupGenericParent,
  DeclarationStartupGenericParentComposition,
  DefaultArgumentBinding,
  DefaultChildBlock,
  EntriesBinding,
  FinishInitialization,
  FinishParentInitialization,
  FinishStep,
  OptionalArgumentBinding,
  OptionalBinding,
  OptionalChildBlock,
  ParentBlock,
  ParentMessage,
  RequiredChildBlock,
  RequiredRestBinding,
  RestChildBlock,
  Startup,
  StartupClient,
  initialize,
  initializeCompatibleStartup,
  initializeMixedStartup,
  initializeWithoutSelectorStartup,
} from './startup-defaults.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type StartupArguments = Expect<
  Equal<Parameters<typeof initialize>, [startup: typeof Startup.Type]>
>
export type DefaultArguments = Expect<
  Equal<Parameters<typeof DefaultChildBlock.init>, [count?: number | undefined]>
>
export type OptionalArguments = Expect<
  Equal<
    Parameters<typeof OptionalChildBlock.init>,
    [count?: number | undefined]
  >
>
export type RequiredRestArguments = Expect<
  Equal<
    Parameters<typeof RestChildBlock.init>,
    [first: number, ...rest: Array<number>]
  >
>
export type CompatibleStartupArguments = Expect<
  Equal<
    Parameters<typeof initializeCompatibleStartup>,
    [startup: Readonly<{ count: number; label: string }>]
  >
>
export type MixedStartupArguments = Expect<
  Equal<
    Parameters<typeof initializeMixedStartup>,
    [startup: Readonly<{ count: number }>]
  >
>
export type StartupServices = Expect<
  Equal<Layer.Services<typeof ParentBlock.EffectsLayer>, StartupClient>
>
export type StartupConstructorError = Expect<
  Equal<Layer.Error<typeof ParentBlock.EffectsLayer>, 'StartupUnavailable'>
>
export type StartupRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initialize>>,
    | Block.RequirementOfBinding<typeof AutomaticBinding>
    | Block.RequirementOfBinding<typeof DefaultArgumentBinding>
    | Block.RequirementOfBinding<typeof OptionalArgumentBinding>
    | Block.RequirementOfBinding<typeof RequiredRestBinding>
    | Block.RequirementOfBinding<typeof OptionalBinding>
    | Block.RequirementOfBinding<typeof EntriesBinding>
  >
>
export type StartupRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof initialize>,
    | Command.HandlerOf<typeof FinishParentInitialization>
    | Command.HandlerOf<typeof FinishStep>
    | Block.Scoped<'automatic', Command.HandlerOf<typeof FinishInitialization>>
    | Block.Scoped<'maybeChild', Command.HandlerOf<typeof FinishInitialization>>
    | Block.Scoped<'entries', Command.HandlerOf<typeof FinishInitialization>>
  >
>

initialize({ count: 3, includeOptional: true, entryIds: ['first'] })
initializeWithoutSelectorStartup()
DeclarationStartupGenericParentComposition.makeInit(() => ({
  startup: { count: 1, includeOptional: false, entryIds: [] },
  model: {},
}))

DeclarationStartupGenericParent.bindChild(ChildBlock, {
  field: 'child',
  placement: 'external',
  parentMessage: ParentMessage.GotChildMessage,
  init: { args: _startup => [] },
})
Application.bindChild(ChildBlock, {
  field: 'child',
  placement: 'external',
  parentMessage: ParentMessage.GotChildMessage,
  init: { args: _startup => [] },
})
DeclarationStartupDefaultsParent.bindChild(RequiredChildBlock, {
  field: 'automatic',
  placement: 'externalOptOut',
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
  init: false,
})

// @ts-expect-error The emitted required child still requires args or opt out.
// oxfmt-ignore
DeclarationStartupDefaultsParent.bindChild(RequiredChildBlock, { field: 'automatic', placement: 'externalMissingArgs', parentMessage: ParentMessage.GotChildMessage, fromParentMessage: false })

DeclarationStartupGenericParent.bindChild(ChildBlock, {
  field: 'child',
  placement: 'externalMutation',
  parentMessage: ParentMessage.GotChildMessage,
  init: {
    args: startup => {
      // @ts-expect-error Emitted Startup fields remain readonly.
      startup.count = 2
      return []
    },
  },
})
