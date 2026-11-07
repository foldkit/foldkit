import { Schema } from 'effect'
import { Block } from 'foldkit'

import {
  ApplicationDefinition,
  ChildBlock,
  ChildInitContext,
  ChildModel,
  DeclarationStartupDefaultsParentComposition,
  DeclarationStartupDefaultsParentDefinition,
  DeclarationStartupGenericParentComposition,
  DeclarationStartupGenericParentDefinition,
  EntriesBinding,
  ForeignGenericBinding,
  ParentMessage,
  RequiredChildBlock,
} from './startup-defaults.accepted.js'

// @ts-expect-error The startup selector is named contextToArgs.
// oxfmt-ignore
DeclarationStartupDefaultsParentDefinition.makeRequiredFieldBinding(ChildBlock, { field: 'automatic', init: { args: () => [] } })

// @ts-expect-error The removed args key cannot accompany contextToArgs.
// oxfmt-ignore
DeclarationStartupDefaultsParentDefinition.makeRequiredFieldBinding(ChildBlock, { field: 'automatic', init: { contextToArgs: () => [], args: () => [] } })

// @ts-expect-error A required-argument child needs init.contextToArgs or init: false.
// oxfmt-ignore
DeclarationStartupDefaultsParentDefinition.makeRequiredFieldBinding(RequiredChildBlock, { field: 'automatic',   })

// @ts-expect-error Child init arguments retain their exact tuple.
// oxfmt-ignore
DeclarationStartupDefaultsParentDefinition.makeRequiredFieldBinding(RequiredChildBlock, { field: 'automatic', init: { contextToArgs: () => ['wrong'] } })

// @ts-expect-error A selector must accept every value allowed by ChildInitContext.
// oxfmt-ignore
DeclarationStartupDefaultsParentDefinition.makeRequiredFieldBinding(ChildBlock, { field: 'automatic', placement: 'narrowStartup', init: { contextToArgs: (_childInitContext: Readonly<{ count: 1 }>) => [] } })

DeclarationStartupDefaultsParentDefinition.makeRequiredFieldBinding(
  ChildBlock,
  {
    field: 'automatic',
    placement: 'readonlyStartup',
    init: {
      contextToArgs: childInitContext => {
        // @ts-expect-error ChildInitContext Schema fields remain readonly.
        childInitContext.count = 2
        return []
      },
    },
  },
)

// @ts-expect-error Optional child initialization requires an explicit presence selector.
// oxfmt-ignore
DeclarationStartupDefaultsParentDefinition.makeOptionalFieldBinding(ChildBlock, { field: 'maybeChild', init: true })

// @ts-expect-error Keyed init false cannot replace an occurrence policy.
// oxfmt-ignore
DeclarationStartupDefaultsParentDefinition.makeKeyedArrayBinding(ChildBlock, { field: 'entries', key: 'id', childField: 'child', init: false })

const optionalInitConfig: Readonly<{
  field: 'automatic'
  init?: false
}> = {
  field: 'automatic',
}
// @ts-expect-error An optional init policy cannot ambiguously change default startup.
DeclarationStartupDefaultsParentDefinition.makeRequiredFieldBinding(
  ChildBlock,
  optionalInitConfig,
)

const unionInitConfig: Readonly<{
  field: 'automatic'
  init: true | false
}> = {
  field: 'automatic',
  init: true,
}
// @ts-expect-error A union init policy does not establish one concrete startup policy.
DeclarationStartupDefaultsParentDefinition.makeRequiredFieldBinding(
  ChildBlock,
  unionInitConfig,
)

DeclarationStartupDefaultsParentComposition.makeInit(
  // @ts-expect-error A default-initialized child field is omitted from the parent-owned Model.
  (childInitContext: typeof ChildInitContext.Type) => ({
    childInitContext,
    model: {
      automatic: ChildModel.make({ count: 1 }),
      optedOut: ChildModel.make({ count: 9 }),
      status: 'Ready',
    },
  }),
)

DeclarationStartupDefaultsParentComposition.makeInit(
  // @ts-expect-error An opted-out required child remains a mandatory parent-owned field.
  (childInitContext: typeof ChildInitContext.Type) => ({
    childInitContext,
    model: { status: 'Ready' },
  }),
)

DeclarationStartupGenericParentComposition.makeInit(() => ({
  // @ts-expect-error A wider selector annotation cannot widen the declared ChildInitContext Schema.
  childInitContext: {},
  model: {},
}))

// @ts-expect-error A Binding cannot change another Definition's ChildInitContext contract.
DeclarationStartupGenericParentDefinition.makeComposition({
  bindings: [ForeignGenericBinding],
})

// @ts-expect-error Application startup selectors use the exact declared ChildInitContext.
// oxfmt-ignore
ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, { field: 'child', init: { contextToArgs: (_childInitContext: Readonly<{ entryIds: readonly [] }>) => [] } })

// @ts-expect-error A keyed startup Binding cannot be registered under an unrelated parent Model.
DeclarationStartupGenericParentDefinition.makeComposition({
  bindings: [EntriesBinding],
})

const IncompatibleStartupModel = Schema.Struct({
  first: ChildModel,
  second: ChildModel,
})
const DeclarationIncompatibleStartupParentDefinition = Block.makeDefinition(
  'DeclarationIncompatibleStartupParent',
  {
    Model: IncompatibleStartupModel,
    Message: ParentMessage,
  },
)
const FirstDiscriminantBinding =
  DeclarationIncompatibleStartupParentDefinition.makeRequiredFieldBinding(
    ChildBlock,
    {
      field: 'first',
      init: {
        contextToArgs: (_childInitContext: Readonly<{ kind: 'First' }>) => [],
      },
    },
  )
const SecondDiscriminantBinding =
  DeclarationIncompatibleStartupParentDefinition.makeRequiredFieldBinding(
    ChildBlock,
    {
      field: 'second',
      init: {
        contextToArgs: (_childInitContext: Readonly<{ kind: 'Second' }>) => [],
      },
    },
  )
// @ts-expect-error Disjoint discriminants cannot form one shared startup input.
DeclarationIncompatibleStartupParentDefinition.makeComposition({
  bindings: [FirstDiscriminantBinding, SecondDiscriminantBinding],
})

const DeclarationPrimitiveStartupParentDefinition = Block.makeDefinition(
  'DeclarationPrimitiveStartupParent',
  {
    Model: IncompatibleStartupModel,
    Message: ParentMessage,
  },
)
const StringStartupBinding =
  DeclarationPrimitiveStartupParentDefinition.makeRequiredFieldBinding(
    ChildBlock,
    {
      field: 'first',
      init: { contextToArgs: (_childInitContext: string) => [] },
    },
  )
const NumberStartupBinding =
  DeclarationPrimitiveStartupParentDefinition.makeRequiredFieldBinding(
    ChildBlock,
    {
      field: 'second',
      init: { contextToArgs: (_childInitContext: number) => [] },
    },
  )
// @ts-expect-error Primitive selector inputs cannot form one shared startup input.
DeclarationPrimitiveStartupParentDefinition.makeComposition({
  bindings: [StringStartupBinding, NumberStartupBinding],
})
