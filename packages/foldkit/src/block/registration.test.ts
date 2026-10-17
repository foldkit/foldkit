import { Array, Layer, Option, Schema, Stream } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Update from '../update/index.js'
import type { BindingRequirement } from './binding.js'
import { define } from './define.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type

const Message = defineMessageUnion({ Advanced: {}, Ignored: {} })
type Message = typeof Message.Type

const ChildOwner = define('RegistrationChild')
const Child = ChildOwner.define({ Model: ChildModel, Message })
const reset = Child.step(_model => ({
  model: ChildModel.make({ count: 0 }),
}))
const ChildComposition = Child.makeComposition()
const ChildBlock = ChildComposition.makeBlock({
  init: () => ({ model: ChildModel.make({ count: 0 }) }),
  update: ChildComposition.makeUpdate(model => ({
    model: ChildModel.make({ count: model.count + 1 }),
  })),
  expose: { reset },
  EffectsLayer: Layer.empty,
})

const ParentModel = Schema.Struct({
  child: ChildModel,
  children: Schema.Array(ChildModel),
})
type ParentModel = typeof ParentModel.Type

const makeParentModel = (child: ChildModel): ParentModel =>
  ParentModel.make({ child, children: [] })

const makeParentModelWithChildOccurrence = (child: ChildModel): ParentModel =>
  ParentModel.make({ child, children: [child] })

const registeredParentBase = define('RegisteredPureChildParent').define({
  Model: ParentModel,
  Message,
})
const ChildBinding = registeredParentBase.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'child',
  read: (model: ParentModel) => Option.some(model.child),
  write: (model, nextChild) => ParentModel.make({ ...model, child: nextChild }),
  toParentMessage: (message: Message) => message,
})

const RegisteredParent = registeredParentBase.makeComposition({
  childBindings: [ChildBinding],
})
const OmittedParent = define('OmittedPureChildParent')
  .define({
    Model: ParentModel,
    Message,
  })
  .makeComposition()

const registeredFold = RegisteredParent.makeBlock({
  init: RegisteredParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: RegisteredParent.makeUpdate((model, message) =>
    ChildBinding.fold(model, message),
  ),
  EffectsLayer: Layer.empty,
})
const omittedFold = OmittedParent.makeBlock({
  init: OmittedParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: OmittedParent.makeUpdate((model, message) =>
    // @ts-expect-error A pure fold cannot execute without its registered child Binding.
    ChildBinding.fold(model, message),
  ),
  // @ts-expect-error A pure fold may use only a registered child binding.
  EffectsLayer: Layer.empty,
})

const registeredStep = RegisteredParent.makeBlock({
  init: RegisteredParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: RegisteredParent.makeUpdate(model => ChildBinding.reset()(model)),
  EffectsLayer: Layer.empty,
})
const omittedStep = OmittedParent.makeBlock({
  init: OmittedParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: OmittedParent.makeUpdate(model =>
    // @ts-expect-error A pure Step cannot execute without its registered child Binding.
    ChildBinding.reset()(model),
  ),
  // @ts-expect-error A pure Step may use only a registered child binding.
  EffectsLayer: Layer.empty,
})

const registeredCombinedStep = RegisteredParent.makeBlock({
  init: RegisteredParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: RegisteredParent.makeUpdate(model =>
    Update.combine(model, [ChildBinding.reset()]),
  ),
  EffectsLayer: Layer.empty,
})
const omittedCombinedStep = OmittedParent.makeBlock({
  init: OmittedParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: OmittedParent.makeUpdate(model =>
    // @ts-expect-error combine cannot execute a child Step without its registered Binding.
    Update.combine(model, [ChildBinding.reset()]),
  ),
  // @ts-expect-error combine preserves the registration of every child Step.
  EffectsLayer: Layer.empty,
})

const dynamicChildSteps = Array.map([ChildBinding.reset()], step => step)
const registeredDynamicCombinedStep = RegisteredParent.makeBlock({
  init: RegisteredParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: RegisteredParent.makeUpdate(model =>
    Update.combine(model, dynamicChildSteps),
  ),
  EffectsLayer: Layer.empty,
})
const omittedDynamicCombinedStep = OmittedParent.makeBlock({
  init: OmittedParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: OmittedParent.makeUpdate(model =>
    // @ts-expect-error A computed Step list cannot execute without its registered Binding.
    Update.combine(model, dynamicChildSteps),
  ),
  // @ts-expect-error A computed Step list retains its child registration.
  EffectsLayer: Layer.empty,
})

const registeredInit = RegisteredParent.makeBlock({
  init: RegisteredParent.makeInit(() =>
    ChildBinding.init({ args: [], toParentModel: makeParentModel }),
  ),
  update: RegisteredParent.makeUpdate(model => ({ model })),
  EffectsLayer: Layer.empty,
})
const omittedInit = OmittedParent.makeBlock({
  init: OmittedParent.makeInit(() =>
    ChildBinding.init({ args: [], toParentModel: makeParentModel }),
  ),
  update: OmittedParent.makeUpdate(model => ({ model })),
  // @ts-expect-error Forwarded init Commands retain their child registration.
  EffectsLayer: Layer.empty,
})

const registeredDefinedUpdate = RegisteredParent.makeUpdate((model, message) =>
  ChildBinding.fold(model, message),
)
const registeredDefinitionUpdate = RegisteredParent.makeBlock({
  init: () => ({ model: makeParentModel(ChildModel.make({ count: 0 })) }),
  update: registeredDefinedUpdate,
  EffectsLayer: Layer.empty,
})
const omittedDefinedUpdate = OmittedParent.makeUpdate((model, message) =>
  // @ts-expect-error A defined update cannot execute an unregistered child Binding.
  ChildBinding.fold(model, message),
)
const omittedDefinitionUpdate = OmittedParent.makeBlock({
  init: () => ({ model: makeParentModel(ChildModel.make({ count: 0 })) }),
  update: omittedDefinedUpdate,
  // @ts-expect-error A defined update preserves the binding used by its result.
  EffectsLayer: Layer.empty,
})

// @ts-expect-error A standalone Update cannot retain a child Binding before graph registration.
const genericUpdate = Update.define((model: ParentModel, message: Message) =>
  // @ts-expect-error A standalone Update cannot execute a child Binding before graph registration.
  ChildBinding.fold(model, message),
)

const branchUpdate = registeredParentBase.step((model, message: Message) =>
  message._tag === 'Advanced' ? ChildBinding.reset() : { model },
)
const registeredBranchDefinedUpdate = RegisteredParent.makeUpdate(
  (model, message) => branchUpdate(model, message),
)
const registeredBranchUpdate = RegisteredParent.makeBlock({
  init: RegisteredParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: registeredBranchDefinedUpdate,
  EffectsLayer: Layer.empty,
})
const omittedBranchDefinedUpdate = OmittedParent.makeUpdate((model, message) =>
  // @ts-expect-error A conditional child Step cannot execute without its registered Binding.
  branchUpdate(model, message),
)
const omittedBranchUpdate = OmittedParent.makeBlock({
  init: OmittedParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: omittedBranchDefinedUpdate,
  // @ts-expect-error A union return retains registration from its child branch.
  EffectsLayer: Layer.empty,
})

const explicitlyAnnotatedUpdate = (model: ParentModel, message: Message) =>
  Message.match<Update.Return<ParentModel, Message>>(message, {
    // @ts-expect-error An explicit Return cannot erase child registration evidence.
    Advanced: () => {
      // @ts-expect-error An explicit Return cannot make a raw Model execute a connected Step.
      return ChildBinding.reset()(model)
    },
    Ignored: () => ({ model }),
  })

const explicitlyAnnotatedCallback = (
  model: ParentModel,
): Update.Return<ParentModel, Message> => {
  // @ts-expect-error An explicit callback return cannot make a raw Model execute a connected Step.
  return ChildBinding.reset()(model)
}

const mappedChildInit = () => {
  return ChildBinding.init({
    args: [],
    toParentModel: makeParentModel,
  })
}
// @ts-expect-error A passive init recipe does not expose a Model before interpretation.
mappedChildInit().model
// @ts-expect-error A passive init recipe does not expose Commands before interpretation.
mappedChildInit().commands
const registeredMappedInit = RegisteredParent.makeBlock({
  init: RegisteredParent.makeInit(mappedChildInit),
  update: RegisteredParent.makeUpdate(model => ({ model })),
  EffectsLayer: Layer.empty,
})
const omittedMappedInit = OmittedParent.makeBlock({
  init: OmittedParent.makeInit(mappedChildInit),
  update: OmittedParent.makeUpdate(model => ({ model })),
  // @ts-expect-error mapMessages preserves child registration on the collection.
  EffectsLayer: Layer.empty,
})

const foldedChildInit = () =>
  Update.foldChildInit(
    // @ts-expect-error Standalone init folds do not interpret passive Binding recipes.
    ChildBinding.init({ args: [], toParentModel: makeParentModel }),
    {
      toParentModel: model => model,
      toParentMessage: (message: Message) => message,
    },
  )

const foldedChildInits = () =>
  Update.foldChildInits(
    {
      // @ts-expect-error Standalone init folds do not interpret passive Binding recipes.
      child: ChildBinding.init({
        args: [],
        toParentModel: makeParentModel,
      }),
    },
    {
      toParentModel: ({ child: model }) => model,
      folds: {
        child: { toParentMessage: (message: Message) => message },
      },
    },
  )

const modelOnlyChildInit = ChildBinding.init({
  args: [],
  toParentModel: makeParentModel,
})
// @ts-expect-error A passive init recipe cannot be narrowed to its future Model.
modelOnlyChildInit.model

const unusedChildParentBase = define('UnusedRegisteredChildParent').define({
  Model: ParentModel,
  Message,
})
const UnusedRegisteredChildBinding = unusedChildParentBase.bindChild(
  ChildBlock,
  {
    fromParentMessage: false,
    placement: 'child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
    toParentMessage: (message: Message) => message,
  },
)
const UnusedChildParent = unusedChildParentBase.makeComposition({
  childBindings: [UnusedRegisteredChildBinding],
})
const RemovedUnusedChildParent = define('RemovedUnusedChildParent')
  .define({
    Model: ParentModel,
    Message,
  })
  .makeComposition()
const unusedChild = UnusedChildParent.makeBlock({
  init: () => ({ model: makeParentModel(ChildModel.make({ count: 0 })) }),
  update: model => ({ model }),
  EffectsLayer: Layer.empty,
})
const removedUnusedChild = RemovedUnusedChildParent.makeBlock({
  init: () => ({ model: makeParentModel(ChildModel.make({ count: 0 })) }),
  update: model => ({ model }),
  EffectsLayer: Layer.empty,
})

const registeredKeyedParentBase = define(
  'RegisteredPureKeyedChildParent',
).define({
  Model: ParentModel,
  Message,
})
const ChildrenBinding = registeredKeyedParentBase.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'children',
  readAll: (model: ParentModel) => model.children,
  key: childModel => childModel.count,
  read: childModel => childModel,
  writeAt: (model, key, nextChild) =>
    ParentModel.make({
      ...model,
      children: model.children.map(childModel =>
        childModel.count === key ? nextChild : childModel,
      ),
    }),
  toParentMessage: (_key, message: Message) => message,
})

const RegisteredKeyedParent = registeredKeyedParentBase.makeComposition({
  childBindings: [ChildrenBinding],
})
const OmittedKeyedParent = define('OmittedPureKeyedChildParent')
  .define({
    Model: ParentModel,
    Message,
  })
  .makeComposition()

const registeredKeyedFold = RegisteredKeyedParent.makeBlock({
  init: RegisteredKeyedParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: RegisteredKeyedParent.makeUpdate((model, message) =>
    ChildrenBinding.fold(model, 0, message),
  ),
  EffectsLayer: Layer.empty,
})
const omittedKeyedFold = OmittedKeyedParent.makeBlock({
  init: OmittedKeyedParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: OmittedKeyedParent.makeUpdate((model, message) =>
    // @ts-expect-error A keyed fold cannot execute without its registered child Binding.
    ChildrenBinding.fold(model, 0, message),
  ),
  // @ts-expect-error A keyed pure fold requires its registered collection.
  EffectsLayer: Layer.empty,
})

const registeredKeyedStep = RegisteredKeyedParent.makeBlock({
  init: RegisteredKeyedParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: RegisteredKeyedParent.makeUpdate(model =>
    ChildrenBinding.reset(0)(model),
  ),
  EffectsLayer: Layer.empty,
})
const omittedKeyedStep = OmittedKeyedParent.makeBlock({
  init: OmittedKeyedParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: OmittedKeyedParent.makeUpdate(model =>
    // @ts-expect-error A keyed Step cannot execute without its registered child Binding.
    ChildrenBinding.reset(0)(model),
  ),
  // @ts-expect-error A keyed pure Step requires its registered collection.
  EffectsLayer: Layer.empty,
})

const registeredKeyedCombinedStep = RegisteredKeyedParent.makeBlock({
  init: RegisteredKeyedParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: RegisteredKeyedParent.makeUpdate(model =>
    Update.combine(model, [ChildrenBinding.reset(0)]),
  ),
  EffectsLayer: Layer.empty,
})
const omittedKeyedCombinedStep = OmittedKeyedParent.makeBlock({
  init: OmittedKeyedParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: OmittedKeyedParent.makeUpdate(model =>
    // @ts-expect-error combine cannot execute a keyed child Step without its registered Binding.
    Update.combine(model, [ChildrenBinding.reset(0)]),
  ),
  // @ts-expect-error combine preserves a keyed child Step's registration.
  EffectsLayer: Layer.empty,
})

const registeredKeyedInit = RegisteredKeyedParent.makeBlock({
  init: RegisteredKeyedParent.makeInit(() =>
    ChildrenBinding.init({
      key: 0,
      args: [],
      toParentModel: makeParentModelWithChildOccurrence,
    }),
  ),
  update: RegisteredKeyedParent.makeUpdate(model => ({ model })),
  EffectsLayer: Layer.empty,
})
const omittedKeyedInit = OmittedKeyedParent.makeBlock({
  init: OmittedKeyedParent.makeInit(() =>
    ChildrenBinding.init({
      key: 0,
      args: [],
      toParentModel: makeParentModelWithChildOccurrence,
    }),
  ),
  update: OmittedKeyedParent.makeUpdate(model => ({ model })),
  // @ts-expect-error Keyed init Commands retain their collection registration.
  EffectsLayer: Layer.empty,
})

const PolicyOutMessage = defineMessageUnion({ RequestedSecondaryReset: {} })
type PolicyOutMessage = typeof PolicyOutMessage.Type

const PolicyChild = define('RegistrationPolicyChild').define({
  Model: ChildModel,
  Message,
  OutMessage: PolicyOutMessage,
})
const PolicyChildBlock = PolicyChild.makeComposition().makeBlock({
  init: () => ({ model: ChildModel.make({ count: 0 }) }),
  update: model => ({
    model,
    outMessage: PolicyOutMessage.RequestedSecondaryReset(),
  }),
  EffectsLayer: Layer.empty,
})

const policyParentBase = define('RegisteredPolicyParent').define({
  Model: ParentModel,
  Message,
})
const SecondaryChildBinding = policyParentBase.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'secondary-child',
  read: (model: ParentModel) => Option.some(model.child),
  write: (model, nextChild) => ParentModel.make({ ...model, child: nextChild }),
  toParentMessage: (message: Message) => message,
})
const unsupportedNestedRawChildStep = Update.foldChildStep({
  // @ts-expect-error A raw child fold cannot erase a binding operation's registration.
  update: (model: ParentModel) => SecondaryChildBinding.reset()(model),
  read: (model: ParentModel) => Option.some(model),
  write: (_model, nextModel) => nextModel,
  toParentMessage: (message: Message) => message,
})
const PolicyChildBinding = policyParentBase.bindChild(PolicyChildBlock, {
  fromParentMessage: false,
  placement: 'policy-child',
  read: (model: ParentModel) => Option.some(model.child),
  write: (model, nextChild) => ParentModel.make({ ...model, child: nextChild }),
  toParentMessage: (message: Message) => message,
  outMessage: {
    fold: (_outMessage: PolicyOutMessage) =>
      policyParentBase.step(() => SecondaryChildBinding.reset()),
  },
})

const RegisteredPolicyParent = policyParentBase.makeComposition({
  childBindings: [PolicyChildBinding, SecondaryChildBinding],
})
const omittedPolicyParentBase = define('OmittedPolicyParent').define({
  Model: ParentModel,
  Message,
})
const OmittedSecondaryChildBinding = omittedPolicyParentBase.bindChild(
  ChildBlock,
  {
    fromParentMessage: false,
    placement: 'secondary-child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
    toParentMessage: (message: Message) => message,
  },
)
const OmittedPolicyChildBinding = omittedPolicyParentBase.bindChild(
  PolicyChildBlock,
  {
    fromParentMessage: false,
    placement: 'policy-child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
    toParentMessage: (message: Message) => message,
    outMessage: {
      fold: (_outMessage: PolicyOutMessage) =>
        omittedPolicyParentBase.step(() =>
          OmittedSecondaryChildBinding.reset(),
        ),
    },
  },
)
// @ts-expect-error An OutMessage policy retains nested child Step registration.
const OmittedPolicyParent = omittedPolicyParentBase.makeComposition({
  childBindings: [OmittedPolicyChildBinding],
})
const registeredPolicyFold = RegisteredPolicyParent.makeBlock({
  init: RegisteredPolicyParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: RegisteredPolicyParent.makeUpdate((model, message) =>
    PolicyChildBinding.fold(model, message),
  ),
  EffectsLayer: Layer.empty,
})
const omittedPolicyFold = OmittedPolicyParent.makeBlock({
  init: OmittedPolicyParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: OmittedPolicyParent.makeUpdate((model, message) =>
    OmittedPolicyChildBinding.fold(model, message),
  ),
  // @ts-expect-error An OutMessage policy retains nested child Step registration.
  EffectsLayer: Layer.empty,
})

const keyedPolicyParentBase = define('RegisteredKeyedPolicyParent').define({
  Model: ParentModel,
  Message,
})
const childModelKey = (childModel: ChildModel) => childModel.count
const SecondaryChildrenBinding = keyedPolicyParentBase.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'secondary-children',
  readAll: (model: ParentModel) => model.children,
  key: childModelKey,
  read: childModel => childModel,
  writeAt: (model, key, nextChild) =>
    ParentModel.make({
      ...model,
      children: model.children.map(childModel =>
        childModel.count === key ? nextChild : childModel,
      ),
    }),
  toParentMessage: (_key, message: Message) => message,
})
const PolicyChildrenBinding = keyedPolicyParentBase.bindChild(
  PolicyChildBlock,
  {
    fromParentMessage: false,
    placement: 'policy-children',
    readAll: (model: ParentModel) => model.children,
    key: childModelKey,
    read: childModel => childModel,
    writeAt: (model, key, nextChild) =>
      ParentModel.make({
        ...model,
        children: model.children.map(childModel =>
          childModel.count === key ? nextChild : childModel,
        ),
      }),
    toParentMessage: (_key, message: Message) => message,
    outMessage: {
      fold: (_key: number, _outMessage: PolicyOutMessage) =>
        SecondaryChildrenBinding.reset(0),
    },
  },
)

const RegisteredKeyedPolicyParent = keyedPolicyParentBase.makeComposition({
  childBindings: [PolicyChildrenBinding, SecondaryChildrenBinding],
})
const omittedKeyedPolicyParentBase = define('OmittedKeyedPolicyParent').define({
  Model: ParentModel,
  Message,
})
const OmittedSecondaryChildrenBinding = omittedKeyedPolicyParentBase.bindChild(
  ChildBlock,
  {
    fromParentMessage: false,
    placement: 'secondary-children',
    readAll: (model: ParentModel) => model.children,
    key: childModelKey,
    read: childModel => childModel,
    writeAt: (model, key, nextChild) =>
      ParentModel.make({
        ...model,
        children: model.children.map(childModel =>
          childModel.count === key ? nextChild : childModel,
        ),
      }),
    toParentMessage: (_key, message: Message) => message,
  },
)
const OmittedPolicyChildrenBinding = omittedKeyedPolicyParentBase.bindChild(
  PolicyChildBlock,
  {
    fromParentMessage: false,
    placement: 'policy-children',
    readAll: (model: ParentModel) => model.children,
    key: childModelKey,
    read: childModel => childModel,
    writeAt: (model, key, nextChild) =>
      ParentModel.make({
        ...model,
        children: model.children.map(childModel =>
          childModel.count === key ? nextChild : childModel,
        ),
      }),
    toParentMessage: (_key, message: Message) => message,
    outMessage: {
      fold: (_key: number, _outMessage: PolicyOutMessage) =>
        OmittedSecondaryChildrenBinding.reset(0),
    },
  },
)
// @ts-expect-error A keyed OutMessage policy retains child Step registration.
const OmittedKeyedPolicyParent = omittedKeyedPolicyParentBase.makeComposition({
  childBindings: [OmittedPolicyChildrenBinding],
})
const registeredKeyedPolicyFold = RegisteredKeyedPolicyParent.makeBlock({
  init: RegisteredKeyedPolicyParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: RegisteredKeyedPolicyParent.makeUpdate((model, message) =>
    PolicyChildrenBinding.fold(model, 0, message),
  ),
  EffectsLayer: Layer.empty,
})
const omittedKeyedPolicyFold = OmittedKeyedPolicyParent.makeBlock({
  init: OmittedKeyedPolicyParent.makeInit(() => ({
    model: makeParentModel(ChildModel.make({ count: 0 })),
  })),
  update: OmittedKeyedPolicyParent.makeUpdate((model, message) =>
    OmittedPolicyChildrenBinding.fold(model, 0, message),
  ),
  // @ts-expect-error A keyed OutMessage policy retains child Step registration.
  EffectsLayer: Layer.empty,
})

const foldOutMessageParentBase = define(
  'RegisteredFoldOutMessageInitParent',
).define({
  Model: ParentModel,
  Message,
})
const FoldOutMessageChildBinding = foldOutMessageParentBase.bindChild(
  ChildBlock,
  {
    fromParentMessage: false,
    placement: 'child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
    toParentMessage: (message: Message) => message,
  },
)
const FoldOutMessageSecondaryChildBinding = foldOutMessageParentBase.bindChild(
  ChildBlock,
  {
    fromParentMessage: false,
    placement: 'secondary-child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
    toParentMessage: (message: Message) => message,
  },
)
const RegisteredFoldOutMessageParent = foldOutMessageParentBase.makeComposition(
  {
    childBindings: [
      FoldOutMessageChildBinding,
      FoldOutMessageSecondaryChildBinding,
    ],
  },
)
const omittedFoldOutMessageParentBase = define(
  'OmittedFoldOutMessageInitParent',
).define({
  Model: ParentModel,
  Message,
})
const OmittedFoldOutMessageChildBinding =
  omittedFoldOutMessageParentBase.bindChild(ChildBlock, {
    fromParentMessage: false,
    placement: 'child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
    toParentMessage: (message: Message) => message,
  })
const OmittedFoldOutMessageParent =
  omittedFoldOutMessageParentBase.makeComposition()
const registeredFoldOutMessageInit = RegisteredFoldOutMessageParent.makeBlock({
  init: RegisteredFoldOutMessageParent.makeInit(() =>
    FoldOutMessageChildBinding.init({
      args: [],
      toParentModel: makeParentModel,
    }),
  ),
  update: RegisteredFoldOutMessageParent.makeUpdate(model => ({ model })),
  EffectsLayer: Layer.empty,
})
const omittedFoldOutMessageInit = OmittedFoldOutMessageParent.makeBlock({
  init: OmittedFoldOutMessageParent.makeInit(() =>
    OmittedFoldOutMessageChildBinding.init({
      args: [],
      toParentModel: makeParentModel,
    }),
  ),
  update: OmittedFoldOutMessageParent.makeUpdate(model => ({ model })),
  // @ts-expect-error A passive init recipe requires its registered child Binding at completion.
  EffectsLayer: Layer.empty,
})
const passiveFoldOutMessageRecipe = FoldOutMessageChildBinding.init({
  args: [],
  toParentModel: makeParentModel,
})
Update.withOutMessage(
  // @ts-expect-error A passive init recipe cannot emit an OutMessage.
  passiveFoldOutMessageRecipe,
  PolicyOutMessage.RequestedSecondaryReset(),
)
Update.foldChildInit(
  // @ts-expect-error Standalone init folds do not interpret passive Binding recipes.
  passiveFoldOutMessageRecipe,
  {
    toParentModel: model => model,
    toParentMessage: (message: Message) => message,
    foldOutMessage: (_outMessage: PolicyOutMessage) =>
      FoldOutMessageSecondaryChildBinding.reset(),
  },
)
RegisteredFoldOutMessageParent.makeInit(() =>
  // @ts-expect-error Block init cannot emit an OutMessage.
  Update.withOutMessage(
    { model: makeParentModel(ChildModel.make({ count: 0 })) },
    PolicyOutMessage.RequestedSecondaryReset(),
  ),
)

const LifecycleOwner = define('RegistrationLifecycleChild')
const Lifecycle = LifecycleOwner.define({
  Model: ChildModel,
  Message,
})
const lifecycleSubscriptions = Lifecycle.subscriptions(entry => ({
  idle: entry('Idle', {
    messages: [],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))
const LifecycleChild = Lifecycle.makeComposition().makeBlock({
  init: () => ({ model: ChildModel.make({ count: 0 }) }),
  update: model => ({ model }),
  subscriptions: lifecycleSubscriptions,
  EffectsLayer: lifecycleSubscriptions.idle.layer,
})
const lifecycleOnlyParentBase = define('LifecycleOnlyChildParent').define({
  Model: ParentModel,
  Message,
})
const LifecycleChildBinding = lifecycleOnlyParentBase.bindChild(
  LifecycleChild,
  {
    fromParentMessage: false,
    placement: 'lifecycle-child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
    toParentMessage: (message: Message) => message,
  },
)

const LifecycleOnlyParent = lifecycleOnlyParentBase.makeComposition({
  childBindings: [LifecycleChildBinding],
})
const RemovedLifecycleParent = define('RemovedLifecycleChildParent')
  .define({
    Model: ParentModel,
    Message,
  })
  .makeComposition()
const lifecycleOnlyChild = LifecycleOnlyParent.makeBlock({
  init: () => ({ model: makeParentModel(ChildModel.make({ count: 0 })) }),
  update: model => ({ model }),
  EffectsLayer: Layer.empty,
})
const removedLifecycleChild = RemovedLifecycleParent.makeBlock({
  init: () => ({ model: makeParentModel(ChildModel.make({ count: 0 })) }),
  update: model => ({ model }),
  EffectsLayer: Layer.empty,
})

const childResultWithOutMessage = (
  model: Parameters<ReturnType<typeof ChildBinding.reset>>[0],
) => Update.withOutMessage(ChildBinding.reset()(model), Message.Advanced())

void registeredFold
void omittedFold
void registeredStep
void omittedStep
void registeredCombinedStep
void omittedCombinedStep
void registeredDynamicCombinedStep
void omittedDynamicCombinedStep
void registeredInit
void omittedInit
void registeredDefinitionUpdate
void omittedDefinitionUpdate
void genericUpdate
void registeredBranchUpdate
void omittedBranchUpdate
void explicitlyAnnotatedUpdate
void explicitlyAnnotatedCallback
void registeredMappedInit
void omittedMappedInit
void foldedChildInit
void foldedChildInits
void modelOnlyChildInit
void unusedChild
void removedUnusedChild
void registeredKeyedFold
void omittedKeyedFold
void registeredKeyedStep
void omittedKeyedStep
void registeredKeyedCombinedStep
void omittedKeyedCombinedStep
void registeredKeyedInit
void omittedKeyedInit
void unsupportedNestedRawChildStep
void registeredPolicyFold
void omittedPolicyFold
void registeredKeyedPolicyFold
void omittedKeyedPolicyFold
void registeredFoldOutMessageInit
void omittedFoldOutMessageInit
void lifecycleOnlyChild
void removedLifecycleChild

it('keeps the declared child graph independent from operation use', () => {
  expect(registeredFold.childBindings).toEqual([ChildBinding])
  expect(removedUnusedChild.childBindings).toEqual([])
  expect(lifecycleOnlyChild.childBindings).toEqual([LifecycleChildBinding])
  expect(removedLifecycleChild.childBindings).toEqual([])
  expectTypeOf<
    Update.RegistrationEvidenceOf<ReturnType<typeof childResultWithOutMessage>>
  >().toEqualTypeOf<BindingRequirement<'child', typeof ChildBlock>>()
  expectTypeOf<
    Update.RequirementsOf<typeof childResultWithOutMessage>
  >().toEqualTypeOf<never>()
})
