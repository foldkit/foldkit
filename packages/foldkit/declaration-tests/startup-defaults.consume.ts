import { Layer } from 'effect'
import { Block, Command, Update } from 'foldkit'

import {
  ApplicationDefinition,
  AutomaticBinding,
  ChildBlock,
  ChildInitContext,
  DeclarationStartupDefaultsParentDefinition,
  DeclarationStartupGenericParentComposition,
  DeclarationStartupGenericParentDefinition,
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
  RequiredChildBlock,
  RequiredRestBinding,
  RestChildBlock,
  StartupClient,
  init,
  initCompatibleStartup,
  initMixedStartup,
  initWithoutSelectorStartup,
} from './startup-defaults.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type StartupArguments = Expect<
  Equal<
    Parameters<typeof init>,
    [childInitContext: typeof ChildInitContext.Type]
  >
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
    Parameters<typeof initCompatibleStartup>,
    [childInitContext: Readonly<{ count: number; label: string }>]
  >
>
export type MixedStartupArguments = Expect<
  Equal<
    Parameters<typeof initMixedStartup>,
    [childInitContext: Readonly<{ count: number }>]
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
    Update.RegistrationEvidenceOf<ReturnType<typeof init>>,
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
    Update.RequirementsOf<typeof init>,
    | Command.HandlerOf<typeof FinishParentInitialization>
    | Command.HandlerOf<typeof FinishStep>
    | Block.Scoped<'automatic', Command.HandlerOf<typeof FinishInitialization>>
    | Block.Scoped<'maybeChild', Command.HandlerOf<typeof FinishInitialization>>
    | Block.Scoped<'entries', Command.HandlerOf<typeof FinishInitialization>>
  >
>

init({ count: 3, includeOptional: true, entryIds: ['first'] })
initWithoutSelectorStartup()
DeclarationStartupGenericParentComposition.makeInit(() => ({
  childInitContext: { count: 1, includeOptional: false, entryIds: [] },
  model: {},
}))

DeclarationStartupGenericParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
  placement: 'external',

  init: { contextToArgs: _childInitContext => [] },
})
ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'child',
  placement: 'external',

  init: { contextToArgs: _childInitContext => [] },
})
DeclarationStartupDefaultsParentDefinition.makeBinding(RequiredChildBlock, {
  field: 'automatic',
  placement: 'externalOptOut',

  init: false,
})

// @ts-expect-error The emitted required child still requires args or opt out.
// oxfmt-ignore
DeclarationStartupDefaultsParentDefinition.makeBinding(RequiredChildBlock, { field: 'automatic', placement: 'externalMissingArgs',   })

DeclarationStartupGenericParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
  placement: 'externalMutation',

  init: {
    contextToArgs: childInitContext => {
      // @ts-expect-error Emitted ChildInitContext fields remain readonly.
      childInitContext.count = 2
      return []
    },
  },
})
