import { Schema } from 'effect'
import { Block } from 'foldkit'

import {
  Application,
  ChildBlock,
  ChildModel,
  DeclarationStartupDefaultsParent,
  DeclarationStartupDefaultsParentComposition,
  DeclarationStartupGenericParent,
  DeclarationStartupGenericParentComposition,
  EntriesBinding,
  ForeignGenericBinding,
  ParentMessage,
  RequiredChildBlock,
  Startup,
} from './startup-defaults.accepted.js'

// @ts-expect-error A required-argument child needs init.args or init: false.
// oxfmt-ignore
DeclarationStartupDefaultsParent.bindChild(RequiredChildBlock, { field: 'automatic', parentMessage: ParentMessage.GotChildMessage, fromParentMessage: false })

// @ts-expect-error Child init arguments retain their exact tuple.
// oxfmt-ignore
DeclarationStartupDefaultsParent.bindChild(RequiredChildBlock, { field: 'automatic', parentMessage: ParentMessage.GotChildMessage, fromParentMessage: false, init: { args: () => ['wrong'] } })

// @ts-expect-error A selector must accept every value allowed by Startup.
// oxfmt-ignore
DeclarationStartupDefaultsParent.bindChild(ChildBlock, { field: 'automatic', placement: 'narrowStartup', parentMessage: ParentMessage.GotChildMessage, fromParentMessage: false, init: { args: (_startup: Readonly<{ count: 1 }>) => [] } })

DeclarationStartupDefaultsParent.bindChild(ChildBlock, {
  field: 'automatic',
  placement: 'readonlyStartup',
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
  init: {
    args: startup => {
      // @ts-expect-error Startup Schema fields remain readonly.
      startup.count = 2
      return []
    },
  },
})

// @ts-expect-error Optional child initialization requires an explicit presence selector.
// oxfmt-ignore
DeclarationStartupDefaultsParent.bindChild(ChildBlock, { field: 'maybeChild', parentMessage: ParentMessage.GotChildMessage, fromParentMessage: false, init: true })

// @ts-expect-error Keyed init false cannot replace an occurrence policy.
// oxfmt-ignore
DeclarationStartupDefaultsParent.bindChild(ChildBlock, { field: 'entries', key: 'id', childField: 'child', toParentMessage: (_id, message) => ParentMessage.GotChildMessage({ message }), fromParentMessage: false, init: false })

const optionalInitConfig: Readonly<{
  field: 'automatic'
  parentMessage: typeof ParentMessage.GotChildMessage
  fromParentMessage: false
  init?: false
}> = {
  field: 'automatic',
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
}
// @ts-expect-error An optional init policy cannot ambiguously change default startup.
DeclarationStartupDefaultsParent.bindChild(ChildBlock, optionalInitConfig)

const unionInitConfig: Readonly<{
  field: 'automatic'
  parentMessage: typeof ParentMessage.GotChildMessage
  fromParentMessage: false
  init: true | false
}> = {
  field: 'automatic',
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
  init: true,
}
// @ts-expect-error A union init policy does not establish one concrete startup policy.
DeclarationStartupDefaultsParent.bindChild(ChildBlock, unionInitConfig)

DeclarationStartupDefaultsParentComposition.makeInit(
  // @ts-expect-error A default-initialized child field is omitted from the parent-owned Model.
  (startup: typeof Startup.Type) => ({
    startup,
    model: {
      automatic: ChildModel.make({ count: 1 }),
      optedOut: ChildModel.make({ count: 9 }),
      status: 'Ready',
    },
  }),
)

DeclarationStartupDefaultsParentComposition.makeInit(
  // @ts-expect-error An opted-out required child remains a mandatory parent-owned field.
  (startup: typeof Startup.Type) => ({
    startup,
    model: { status: 'Ready' },
  }),
)

DeclarationStartupGenericParentComposition.makeInit(() => ({
  // @ts-expect-error A wider selector annotation cannot widen the declared Startup Schema.
  startup: {},
  model: {},
}))

// @ts-expect-error A Binding cannot change another Definition's Startup contract.
DeclarationStartupGenericParent.makeComposition({
  childBindings: [ForeignGenericBinding],
})

// @ts-expect-error Application startup selectors use the exact declared Startup.
// oxfmt-ignore
Application.bindChild(ChildBlock, { field: 'child', parentMessage: ParentMessage.GotChildMessage, init: { args: (_startup: Readonly<{ entryIds: readonly [] }>) => [] } })

// @ts-expect-error A keyed startup Binding cannot be registered under an unrelated parent Model.
DeclarationStartupGenericParent.makeComposition({
  childBindings: [EntriesBinding],
})

const IncompatibleStartupModel = Schema.Struct({
  first: ChildModel,
  second: ChildModel,
})
const DeclarationIncompatibleStartupParent = Block.define(
  'DeclarationIncompatibleStartupParent',
  {
    Model: IncompatibleStartupModel,
    Message: ParentMessage,
  },
)
const FirstDiscriminantBinding = DeclarationIncompatibleStartupParent.bindChild(
  ChildBlock,
  {
    field: 'first',
    parentMessage: ParentMessage.GotChildMessage,
    fromParentMessage: false,
    init: { args: (_startup: Readonly<{ kind: 'First' }>) => [] },
  },
)
const SecondDiscriminantBinding =
  DeclarationIncompatibleStartupParent.bindChild(ChildBlock, {
    field: 'second',
    parentMessage: ParentMessage.GotChildMessage,
    fromParentMessage: false,
    init: { args: (_startup: Readonly<{ kind: 'Second' }>) => [] },
  })
// @ts-expect-error Disjoint discriminants cannot form one shared startup input.
DeclarationIncompatibleStartupParent.makeComposition({
  childBindings: [FirstDiscriminantBinding, SecondDiscriminantBinding],
})

const DeclarationPrimitiveStartupParent = Block.define(
  'DeclarationPrimitiveStartupParent',
  {
    Model: IncompatibleStartupModel,
    Message: ParentMessage,
  },
)
const StringStartupBinding = DeclarationPrimitiveStartupParent.bindChild(
  ChildBlock,
  {
    field: 'first',
    parentMessage: ParentMessage.GotChildMessage,
    fromParentMessage: false,
    init: { args: (_startup: string) => [] },
  },
)
const NumberStartupBinding = DeclarationPrimitiveStartupParent.bindChild(
  ChildBlock,
  {
    field: 'second',
    parentMessage: ParentMessage.GotChildMessage,
    fromParentMessage: false,
    init: { args: (_startup: number) => [] },
  },
)
// @ts-expect-error Primitive selector inputs cannot form one shared startup input.
DeclarationPrimitiveStartupParent.makeComposition({
  childBindings: [StringStartupBinding, NumberStartupBinding],
})
