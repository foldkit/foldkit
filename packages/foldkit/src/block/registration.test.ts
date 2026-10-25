import { Array, Layer, Option, Schema, Stream, Tuple } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Update from '../update/index.js'
import type { RequirementOfBinding } from './binding.js'
import { makeNamespace } from './define.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type

const Message = defineMessageUnion({
  RequestedReset: {},
  Advanced: {},
  Ignored: {},
})
type Message = typeof Message.Type
const ParentMessage = defineMessageUnion({
  Advanced: {},
  Ignored: {},
})

const ChildNamespace = makeNamespace('RegistrationChild')
const ChildDefinition = ChildNamespace.makeDefinition({
  Model: ChildModel,
  Message,
})
const reset = ChildDefinition.makeStep(_model => ({
  model: ChildModel.make({ count: 0 }),
}))
const ChildComposition = ChildDefinition.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ count: 0 }) }),
    update: ChildComposition.makeUpdate({
      RequestedReset: model => reset(model),
      Advanced: model => ({
        model: ChildModel.make({ count: model.count + 1 }),
      }),
      Ignored: model => ({
        model: ChildModel.make({ count: model.count + 1 }),
      }),
    }),
    operations: { reset: () => Tuple.make(Message.RequestedReset()) },
    EffectsLayer: Layer.empty,
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const ParentModel = Schema.Struct({
  child: ChildModel,
  children: Schema.Array(ChildModel),
})
type ParentModel = typeof ParentModel.Type

const makeParentModel = (child: ChildModel): ParentModel =>
  ParentModel.make({ child, children: [] })

const makeParentModelWithChildOccurrence = (child: ChildModel): ParentModel =>
  ParentModel.make({ child, children: [child] })

const RegisteredParentBaseDefinition = makeNamespace(
  'RegisteredPureChildParent',
).makeDefinition({
  Model: ParentModel,
  Message: ParentMessage,
})
const ChildBinding = RegisteredParentBaseDefinition.makeBinding(ChildBlock, {
  placement: 'child',
  read: (model: ParentModel) => Option.some(model.child),
  write: (model, nextChild) => ParentModel.make({ ...model, child: nextChild }),
})

const RegisteredParent = RegisteredParentBaseDefinition.makeComposition({
  bindings: [ChildBinding],
})
const OmittedParentBaseDefinition = makeNamespace(
  'OmittedPureChildParent',
).makeDefinition({
  Model: ParentModel,
  Message: ParentMessage,
})
const AlternateChildBinding = OmittedParentBaseDefinition.makeBinding(
  ChildBlock,
  {
    field: 'child',
    placement: 'alternate',
    init: false,
  },
)
const OmittedParent = OmittedParentBaseDefinition.makeComposition({
  bindings: [AlternateChildBinding],
})

const prepareRegisteredFold = () =>
  RegisteredParent.prepareBlock({
    init: RegisteredParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: RegisteredParent.makeUpdate({
      Ignored: (model, message) => ChildBinding.fold(model, message),
      Advanced: (model, message) => ChildBinding.fold(model, message),
    }),
    EffectsLayer: Layer.empty,
  })
const registeredFold: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredFold
> = Block.assemble(prepareRegisteredFold)
const prepareOmittedFold = () =>
  // @ts-expect-error A pure fold may use only a registered child binding.
  OmittedParent.prepareBlock({
    init: OmittedParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: OmittedParent.makeUpdate({
      Ignored: (model, message) =>
        // @ts-expect-error A pure fold cannot execute without its registered child Binding.
        ChildBinding.fold(model, message),
      Advanced: (model, message) =>
        // @ts-expect-error A pure fold cannot execute without its registered child Binding.
        ChildBinding.fold(model, message),
    }),
    EffectsLayer: Layer.empty,
  })
const omittedFold: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareOmittedFold
> = Block.assemble(prepareOmittedFold)

const prepareRegisteredStep = () =>
  RegisteredParent.prepareBlock({
    init: RegisteredParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: RegisteredParent.makeUpdate({
      Ignored: model => ChildBinding.reset()(model),
      Advanced: model => ChildBinding.reset()(model),
    }),
    EffectsLayer: Layer.empty,
  })
const registeredStep: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredStep
> = Block.assemble(prepareRegisteredStep)
const prepareOmittedStep = () =>
  // @ts-expect-error A pure Step may use only a registered child binding.
  OmittedParent.prepareBlock({
    init: OmittedParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: OmittedParent.makeUpdate({
      Ignored: model =>
        // @ts-expect-error A pure Step cannot execute without its registered child Binding.
        ChildBinding.reset()(model),
      Advanced: model =>
        // @ts-expect-error A pure Step cannot execute without its registered child Binding.
        ChildBinding.reset()(model),
    }),
    EffectsLayer: Layer.empty,
  })
const omittedStep: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareOmittedStep
> = Block.assemble(prepareOmittedStep)

const prepareRegisteredCombinedStep = () =>
  RegisteredParent.prepareBlock({
    init: RegisteredParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: RegisteredParent.makeUpdate({
      Ignored: model => Update.combineSteps(model, [ChildBinding.reset()]),
      Advanced: model => Update.combineSteps(model, [ChildBinding.reset()]),
    }),
    EffectsLayer: Layer.empty,
  })
const registeredCombinedStep: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredCombinedStep
> = Block.assemble(prepareRegisteredCombinedStep)
const prepareOmittedCombinedStep = () =>
  // @ts-expect-error combine preserves the registration of every child Step.
  OmittedParent.prepareBlock({
    init: OmittedParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: OmittedParent.makeUpdate({
      Ignored: model =>
        // @ts-expect-error combine cannot execute a child Step without its registered Binding.
        Update.combineSteps(model, [ChildBinding.reset()]),
      Advanced: model =>
        // @ts-expect-error combine cannot execute a child Step without its registered Binding.
        Update.combineSteps(model, [ChildBinding.reset()]),
    }),
    EffectsLayer: Layer.empty,
  })
const omittedCombinedStep: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareOmittedCombinedStep
> = Block.assemble(prepareOmittedCombinedStep)

const dynamicChildSteps = Array.map([ChildBinding.reset()], step => step)
const registeredDynamicCombinedUpdate = RegisteredParent.makeUpdate({
  Ignored: model => Update.combineSteps(model, dynamicChildSteps),
  Advanced: model => Update.combineSteps(model, dynamicChildSteps),
})
const prepareRegisteredDynamicCombinedStep = () =>
  RegisteredParent.prepareBlock({
    init: RegisteredParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: registeredDynamicCombinedUpdate,
    EffectsLayer: Layer.empty,
  })
const registeredDynamicCombinedStep: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredDynamicCombinedStep
> = Block.assemble(prepareRegisteredDynamicCombinedStep)

const mixedConnectedSteps = Tuple.make(
  ChildBinding.reset(),
  RegisteredParentBaseDefinition.makeNoopStep(),
)
const combinedMixedConnectedStep = Update.combineSteps(mixedConnectedSteps)
const deferredMixedConnectedStep = RegisteredParentBaseDefinition.makeStep(() =>
  Update.combineSteps(mixedConnectedSteps),
)
const mixedConnectedUpdate = RegisteredParent.makeUpdate({
  Ignored: model =>
    Update.combineSteps(model, [
      ChildBinding.reset(),
      RegisteredParentBaseDefinition.makeNoopStep(),
    ]),
  Advanced: model =>
    Update.combineSteps(model, [
      ChildBinding.reset(),
      RegisteredParentBaseDefinition.makeNoopStep(),
    ]),
})
const reversedMixedConnectedUpdate = RegisteredParent.makeUpdate({
  Ignored: model =>
    Update.combineSteps(model, [
      RegisteredParentBaseDefinition.makeNoopStep(),
      ChildBinding.reset(),
    ]),
  Advanced: model =>
    Update.combineSteps(model, [
      RegisteredParentBaseDefinition.makeNoopStep(),
      ChildBinding.reset(),
    ]),
})
const tupleMixedConnectedUpdate = RegisteredParent.makeUpdate({
  Ignored: model => Update.combineSteps(model, mixedConnectedSteps),
  Advanced: model => Update.combineSteps(model, mixedConnectedSteps),
})
const deferredMixedConnectedUpdate = RegisteredParent.makeUpdate({
  Ignored: model => deferredMixedConnectedStep(model),
  Advanced: model => deferredMixedConnectedStep(model),
})
const explicitGenericOrdinaryUpdate = RegisteredParent.makeUpdate({
  Ignored: model =>
    Update.combineSteps<typeof model, typeof ParentMessage.Type, never>(model, [
      stepModel => ({ model: stepModel }),
    ]),
  Advanced: model =>
    Update.combineSteps<typeof model, typeof ParentMessage.Type, never>(model, [
      stepModel => ({ model: stepModel }),
    ]),
})
const rejectRawMixedConnectedSteps = (model: ParentModel) => {
  // @ts-expect-error A generic no-op cannot erase a connected Step's graph requirement.
  // oxfmt-ignore
  Update.combineSteps(model, [ChildBinding.reset(), RegisteredParentBaseDefinition.makeNoopStep()])
  // @ts-expect-error Reversing Steps cannot erase the connected graph requirement.
  // oxfmt-ignore
  Update.combineSteps(model, [RegisteredParentBaseDefinition.makeNoopStep(), ChildBinding.reset()])
  // @ts-expect-error A predeclared tuple retains the connected graph requirement.
  Update.combineSteps(model, mixedConnectedSteps)
  // @ts-expect-error Deferred mixed Steps still require their registered Composition.
  deferredMixedConnectedStep(model)
}
const rejectReadableMixedRecipe = (
  model: Parameters<typeof combinedMixedConnectedStep>[0],
) => {
  const combined = combinedMixedConnectedStep(model)

  // @ts-expect-error A connected combination remains opaque before composition.
  combined.model
  // @ts-expect-error A connected combination cannot expose unresolved Commands.
  combined.commands
}
void rejectRawMixedConnectedSteps
void rejectReadableMixedRecipe

OmittedParent.makeUpdate({
  // @ts-expect-error A computed Step list cannot execute without its registered Binding.
  Ignored: model => Update.combineSteps(model, dynamicChildSteps),
  Advanced: model => ({ model }),
})
const prepareOmittedDynamicCombinedStep = () =>
  OmittedParent.prepareBlock({
    init: OmittedParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    // @ts-expect-error A computed Step list retains its child registration and generated dispatch Schema.
    update: registeredDynamicCombinedUpdate,
    EffectsLayer: Layer.empty,
  })
const assembleOmittedDynamicCombinedStep = () => {
  // @ts-expect-error The omitted Composition cannot produce the registered update assembly.
  const omittedDynamicCombinedStep: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof ParentModel,
    // @ts-expect-error The invalid assembly producer does not satisfy the public extraction constraint.
    typeof prepareOmittedDynamicCombinedStep
    // @ts-expect-error The invalid assembly remains rejected when assembled.
  > = Block.assemble(prepareOmittedDynamicCombinedStep)

  return omittedDynamicCombinedStep
}

const prepareRegisteredInit = () =>
  RegisteredParent.prepareBlock({
    init: RegisteredParent.makeInit(() =>
      ChildBinding.init({ args: [], toParentModel: makeParentModel }),
    ),
    update: RegisteredParent.makeUpdate({
      Ignored: model => ({ model }),
      Advanced: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const registeredInit: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredInit
> = Block.assemble(prepareRegisteredInit)
const prepareOmittedInit = () =>
  // @ts-expect-error Forwarded init Commands retain their child registration.
  OmittedParent.prepareBlock({
    init: OmittedParent.makeInit(() =>
      ChildBinding.init({ args: [], toParentModel: makeParentModel }),
    ),
    update: OmittedParent.makeUpdate({
      Ignored: model => ({ model }),
      Advanced: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const omittedInit: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareOmittedInit
> = Block.assemble(prepareOmittedInit)

const registeredDefinedUpdate = RegisteredParent.makeUpdate({
  Ignored: (model, message) => ChildBinding.fold(model, message),
  Advanced: (model, message) => ChildBinding.fold(model, message),
})
const prepareRegisteredDefinitionUpdate = () =>
  RegisteredParent.prepareBlock({
    init: () => ({ model: makeParentModel(ChildModel.make({ count: 0 })) }),
    update: registeredDefinedUpdate,
    EffectsLayer: Layer.empty,
  })
const registeredDefinitionUpdate: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredDefinitionUpdate
> = Block.assemble(prepareRegisteredDefinitionUpdate)
const omittedDefinedUpdate = OmittedParent.makeUpdate({
  Ignored: (model, message) =>
    // @ts-expect-error A defined update cannot execute an unregistered child Binding.
    ChildBinding.fold(model, message),
  Advanced: (model, message) =>
    // @ts-expect-error A defined update cannot execute an unregistered child Binding.
    ChildBinding.fold(model, message),
})
const prepareOmittedDefinitionUpdate = () =>
  // @ts-expect-error A defined update preserves the binding used by its result.
  OmittedParent.prepareBlock({
    init: () => ({ model: makeParentModel(ChildModel.make({ count: 0 })) }),
    update: omittedDefinedUpdate,
    EffectsLayer: Layer.empty,
  })
const omittedDefinitionUpdate: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareOmittedDefinitionUpdate
> = Block.assemble(prepareOmittedDefinitionUpdate)

// @ts-expect-error A standalone Update cannot retain a child Binding before graph registration.
const genericUpdate = Update.define((model: ParentModel, message: Message) =>
  // @ts-expect-error A standalone Update cannot execute a child Binding before graph registration.
  ChildBinding.fold(model, message),
)

const branchUpdate = RegisteredParentBaseDefinition.makeStep(
  (model, message: Message) =>
    message._tag === 'Advanced' ? ChildBinding.reset() : { model },
)
const registeredBranchDefinedUpdate = RegisteredParent.makeUpdate({
  Ignored: (model, message) => branchUpdate(model, message),
  Advanced: (model, message) => branchUpdate(model, message),
})
const prepareRegisteredBranchUpdate = () =>
  RegisteredParent.prepareBlock({
    init: RegisteredParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: registeredBranchDefinedUpdate,
    EffectsLayer: Layer.empty,
  })
const registeredBranchUpdate: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredBranchUpdate
> = Block.assemble(prepareRegisteredBranchUpdate)
OmittedParent.makeUpdate({
  // @ts-expect-error A conditional child Step cannot execute without its registered Binding.
  Ignored: (model, message) => branchUpdate(model, message),
  Advanced: model => ({ model }),
})
const prepareOmittedBranchUpdate = () =>
  OmittedParent.prepareBlock({
    init: OmittedParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    // @ts-expect-error A union return retains registration from its child branch and its dispatch Schema.
    update: registeredBranchDefinedUpdate,
    EffectsLayer: Layer.empty,
  })
const assembleOmittedBranchUpdate = () => {
  // @ts-expect-error The omitted Composition cannot produce the registered update assembly.
  const omittedBranchUpdate: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof ParentModel,
    // @ts-expect-error The invalid assembly producer does not satisfy the public extraction constraint.
    typeof prepareOmittedBranchUpdate
    // @ts-expect-error The invalid assembly remains rejected when assembled.
  > = Block.assemble(prepareOmittedBranchUpdate)

  return omittedBranchUpdate
}

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
const prepareRegisteredMappedInit = () =>
  RegisteredParent.prepareBlock({
    init: RegisteredParent.makeInit(mappedChildInit),
    update: RegisteredParent.makeUpdate({
      Ignored: model => ({ model }),
      Advanced: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const registeredMappedInit: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredMappedInit
> = Block.assemble(prepareRegisteredMappedInit)
const prepareOmittedMappedInit = () =>
  // @ts-expect-error mapMessages preserves child registration on the collection.
  OmittedParent.prepareBlock({
    init: OmittedParent.makeInit(mappedChildInit),
    update: OmittedParent.makeUpdate({
      Ignored: model => ({ model }),
      Advanced: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const omittedMappedInit: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareOmittedMappedInit
> = Block.assemble(prepareOmittedMappedInit)

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

const UnusedChildParentBaseDefinition = makeNamespace(
  'UnusedRegisteredChildParent',
).makeDefinition({
  Model: ParentModel,
  Message: ParentMessage,
})
const UnusedRegisteredChildBinding =
  UnusedChildParentBaseDefinition.makeBinding(ChildBlock, {
    placement: 'child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
  })
const UnusedChildParent = UnusedChildParentBaseDefinition.makeComposition({
  bindings: [UnusedRegisteredChildBinding],
})
const RemovedUnusedChildParent = makeNamespace('RemovedUnusedChildParent')
  .makeDefinition({
    Model: ParentModel,
    Message,
  })
  .makeComposition()
const prepareUnusedChild = () =>
  UnusedChildParent.prepareBlock({
    init: () => ({ model: makeParentModel(ChildModel.make({ count: 0 })) }),
    update: UnusedChildParent.makeUpdate({
      Ignored: model => ({ model }),
      Advanced: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const unusedChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareUnusedChild
> = Block.assemble(prepareUnusedChild)
const prepareRemovedUnusedChild = () =>
  RemovedUnusedChildParent.prepareBlock({
    init: () => ({ model: makeParentModel(ChildModel.make({ count: 0 })) }),
    update: RemovedUnusedChildParent.makeUpdate({
      RequestedReset: model => ({ model }),
      Ignored: model => ({ model }),
      Advanced: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const removedUnusedChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRemovedUnusedChild
> = Block.assemble(prepareRemovedUnusedChild)

const KeyedParentMessage = defineMessageUnion({
  Advanced: {},
  Ignored: {},
})

const RegisteredKeyedParentBaseDefinition = makeNamespace(
  'RegisteredPureKeyedChildParent',
).makeDefinition({
  Model: ParentModel,
  Message: KeyedParentMessage,
})
const ChildrenBinding = RegisteredKeyedParentBaseDefinition.makeBinding(
  ChildBlock,
  {
    placement: 'children',
    keySchema: Schema.Number,
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
  },
)

const RegisteredKeyedParent =
  RegisteredKeyedParentBaseDefinition.makeComposition({
    bindings: [ChildrenBinding],
  })
const OmittedKeyedParentBaseDefinition = makeNamespace(
  'OmittedPureKeyedChildParent',
).makeDefinition({
  Model: ParentModel,
  Message: KeyedParentMessage,
})
const AlternateChildrenBinding = OmittedKeyedParentBaseDefinition.makeBinding(
  ChildBlock,
  {
    placement: 'alternate-children',
    keySchema: Schema.Number,
    readAll: model => model.children,
    key: child => child.count,
    read: child => child,
    writeAt: model => model,
  },
)
const OmittedKeyedParent = OmittedKeyedParentBaseDefinition.makeComposition({
  bindings: [AlternateChildrenBinding],
})

const prepareRegisteredKeyedFold = () =>
  RegisteredKeyedParent.prepareBlock({
    init: RegisteredKeyedParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: RegisteredKeyedParent.makeUpdate({
      Ignored: (model, message) => ChildrenBinding.fold(model, 0, message),
      Advanced: (model, message) => ChildrenBinding.fold(model, 0, message),
    }),
    EffectsLayer: Layer.empty,
  })
const registeredKeyedFold: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredKeyedFold
> = Block.assemble(prepareRegisteredKeyedFold)
const prepareOmittedKeyedFold = () =>
  // @ts-expect-error A keyed pure fold requires its registered collection.
  OmittedKeyedParent.prepareBlock({
    init: OmittedKeyedParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: OmittedKeyedParent.makeUpdate({
      Ignored: (model, message) =>
        // @ts-expect-error A keyed fold cannot execute without its registered child Binding.
        ChildrenBinding.fold(model, 0, message),
      Advanced: (model, message) =>
        // @ts-expect-error A keyed fold cannot execute without its registered child Binding.
        ChildrenBinding.fold(model, 0, message),
    }),
    EffectsLayer: Layer.empty,
  })
const omittedKeyedFold: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareOmittedKeyedFold
> = Block.assemble(prepareOmittedKeyedFold)

const prepareRegisteredKeyedStep = () =>
  RegisteredKeyedParent.prepareBlock({
    init: RegisteredKeyedParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: RegisteredKeyedParent.makeUpdate({
      Ignored: model => ChildrenBinding.reset(0)(model),
      Advanced: model => ChildrenBinding.reset(0)(model),
    }),
    EffectsLayer: Layer.empty,
  })
const registeredKeyedStep: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredKeyedStep
> = Block.assemble(prepareRegisteredKeyedStep)
const prepareOmittedKeyedStep = () =>
  // @ts-expect-error A keyed pure Step requires its registered collection.
  OmittedKeyedParent.prepareBlock({
    init: OmittedKeyedParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: OmittedKeyedParent.makeUpdate({
      Ignored: model =>
        // @ts-expect-error A keyed Step cannot execute without its registered child Binding.
        ChildrenBinding.reset(0)(model),
      Advanced: model =>
        // @ts-expect-error A keyed Step cannot execute without its registered child Binding.
        ChildrenBinding.reset(0)(model),
    }),
    EffectsLayer: Layer.empty,
  })
const omittedKeyedStep: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareOmittedKeyedStep
> = Block.assemble(prepareOmittedKeyedStep)

const prepareRegisteredKeyedCombinedStep = () =>
  RegisteredKeyedParent.prepareBlock({
    init: RegisteredKeyedParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: RegisteredKeyedParent.makeUpdate({
      Ignored: model => Update.combineSteps(model, [ChildrenBinding.reset(0)]),
      Advanced: model => Update.combineSteps(model, [ChildrenBinding.reset(0)]),
    }),
    EffectsLayer: Layer.empty,
  })
const registeredKeyedCombinedStep: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredKeyedCombinedStep
> = Block.assemble(prepareRegisteredKeyedCombinedStep)
const prepareOmittedKeyedCombinedStep = () =>
  // @ts-expect-error combine preserves a keyed child Step's registration.
  OmittedKeyedParent.prepareBlock({
    init: OmittedKeyedParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: OmittedKeyedParent.makeUpdate({
      Ignored: model =>
        // @ts-expect-error combine cannot execute a keyed child Step without its registered Binding.
        Update.combineSteps(model, [ChildrenBinding.reset(0)]),
      Advanced: model =>
        // @ts-expect-error combine cannot execute a keyed child Step without its registered Binding.
        Update.combineSteps(model, [ChildrenBinding.reset(0)]),
    }),
    EffectsLayer: Layer.empty,
  })
const omittedKeyedCombinedStep: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareOmittedKeyedCombinedStep
> = Block.assemble(prepareOmittedKeyedCombinedStep)

const prepareRegisteredKeyedInit = () =>
  RegisteredKeyedParent.prepareBlock({
    init: RegisteredKeyedParent.makeInit(() =>
      ChildrenBinding.init({
        key: 0,
        args: [],
        toParentModel: makeParentModelWithChildOccurrence,
      }),
    ),
    update: RegisteredKeyedParent.makeUpdate({
      Ignored: model => ({ model }),
      Advanced: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const registeredKeyedInit: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredKeyedInit
> = Block.assemble(prepareRegisteredKeyedInit)
const prepareOmittedKeyedInit = () =>
  // @ts-expect-error Keyed init Commands retain their collection registration.
  OmittedKeyedParent.prepareBlock({
    init: OmittedKeyedParent.makeInit(() =>
      ChildrenBinding.init({
        key: 0,
        args: [],
        toParentModel: makeParentModelWithChildOccurrence,
      }),
    ),
    update: OmittedKeyedParent.makeUpdate({
      Ignored: model => ({ model }),
      Advanced: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const omittedKeyedInit: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareOmittedKeyedInit
> = Block.assemble(prepareOmittedKeyedInit)

const PolicyOutMessage = defineMessageUnion({ RequestedSecondaryReset: {} })
type PolicyOutMessage = typeof PolicyOutMessage.Type

const PolicyChildComposition = makeNamespace('RegistrationPolicyChild')
  .makeDefinition({
    Model: ChildModel,
    Message,
    OutMessage: PolicyOutMessage,
  })
  .makeComposition()
const preparePolicyChildBlock = () =>
  PolicyChildComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ count: 0 }) }),
    update: PolicyChildComposition.makeUpdate({
      RequestedReset: model => ({
        model,
        outMessage: PolicyOutMessage.RequestedSecondaryReset(),
      }),
      Ignored: model => ({
        model,
        outMessage: PolicyOutMessage.RequestedSecondaryReset(),
      }),
      Advanced: model => ({
        model,
        outMessage: PolicyOutMessage.RequestedSecondaryReset(),
      }),
    }),
    operations: { requestSecondaryReset: Message.Advanced },
    EffectsLayer: Layer.empty,
  })
const PolicyChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof preparePolicyChildBlock
> = Block.assemble(preparePolicyChildBlock)

const PolicyParentMessage = defineMessageUnion({
  Advanced: {},
  Ignored: {},
})
const PolicyParentBaseDefinition = makeNamespace(
  'RegisteredPolicyParent',
).makeDefinition({
  Model: ParentModel,
  Message: PolicyParentMessage,
})
const SecondaryChildBinding = PolicyParentBaseDefinition.makeBinding(
  ChildBlock,
  {
    placement: 'secondary-child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
  },
)
const unsupportedNestedRawChildStep = Update.foldChildStep({
  // @ts-expect-error A raw child fold cannot erase a binding operation's registration.
  update: (model: ParentModel) => SecondaryChildBinding.reset()(model),
  read: (model: ParentModel) => Option.some(model),
  write: (_model, nextModel) => nextModel,
  toParentMessage: (message: Message) => message,
})
const PolicyChildBinding = PolicyParentBaseDefinition.makeBinding(
  PolicyChildBlock,
  {
    placement: 'policy-child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
  },
).withOutMessagePolicy({
  fold: (_outMessage: PolicyOutMessage) =>
    PolicyParentBaseDefinition.makeStep(() => SecondaryChildBinding.reset()),
})

const RegisteredPolicyParent = PolicyParentBaseDefinition.makeComposition({
  bindings: [PolicyChildBinding, SecondaryChildBinding],
})
const OmittedPolicyParentBaseDefinition = makeNamespace(
  'OmittedPolicyParent',
).makeDefinition({
  Model: ParentModel,
  Message: PolicyParentMessage,
})
const OmittedSecondaryChildBinding =
  OmittedPolicyParentBaseDefinition.makeBinding(ChildBlock, {
    placement: 'secondary-child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
  })
const OmittedPolicyChildBinding = OmittedPolicyParentBaseDefinition.makeBinding(
  PolicyChildBlock,
  {
    placement: 'policy-child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
  },
).withOutMessagePolicy({
  fold: (_outMessage: PolicyOutMessage) =>
    OmittedPolicyParentBaseDefinition.makeStep(() =>
      OmittedSecondaryChildBinding.reset(),
    ),
})
const AlternateSecondaryChildBinding =
  OmittedPolicyParentBaseDefinition.makeBinding(ChildBlock, {
    field: 'child',
    placement: 'alternate-secondary',
    init: false,
  })
// @ts-expect-error An OutMessage policy retains nested child Step registration.
const OmittedPolicyParent = OmittedPolicyParentBaseDefinition.makeComposition({
  bindings: [OmittedPolicyChildBinding, AlternateSecondaryChildBinding],
})
const prepareRegisteredPolicyFold = () =>
  RegisteredPolicyParent.prepareBlock({
    init: RegisteredPolicyParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: RegisteredPolicyParent.makeUpdate({
      Ignored: (model, message) => PolicyChildBinding.fold(model, message),
      Advanced: (model, message) => PolicyChildBinding.fold(model, message),
    }),
    EffectsLayer: Layer.empty,
  })
const registeredPolicyFold: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredPolicyFold
> = Block.assemble(prepareRegisteredPolicyFold)
const combinedPolicyStep = Update.combineSteps([
  PolicyChildBinding.requestSecondaryReset(),
  PolicyParentBaseDefinition.makeNoopStep(),
])
const mixedPolicyUpdate = RegisteredPolicyParent.makeUpdate({
  Ignored: model =>
    Update.combineSteps(model, [
      PolicyChildBinding.requestSecondaryReset(),
      PolicyParentBaseDefinition.makeNoopStep(),
    ]),
  Advanced: model =>
    Update.combineSteps(model, [
      PolicyChildBinding.requestSecondaryReset(),
      PolicyParentBaseDefinition.makeNoopStep(),
    ]),
})
const rejectReadableMixedPolicy = (
  model: Parameters<typeof combinedPolicyStep>[0],
) => {
  const combined = combinedPolicyStep(model)

  // @ts-expect-error A potentially deferred policy combination is not a readable result.
  combined.model
  // @ts-expect-error Policy Commands remain opaque until checked composition.
  combined.commands
}
void rejectReadableMixedPolicy
const KeyedPolicyParentMessage = defineMessageUnion({
  Advanced: {},
  Ignored: {},
})
const KeyedPolicyParentBaseDefinition = makeNamespace(
  'RegisteredKeyedPolicyParent',
).makeDefinition({
  Model: ParentModel,
  Message: KeyedPolicyParentMessage,
})
const childModelKey = (childModel: ChildModel) => childModel.count
const SecondaryChildrenBinding = KeyedPolicyParentBaseDefinition.makeBinding(
  ChildBlock,
  {
    placement: 'secondary-children',
    keySchema: Schema.Number,
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
  },
)
const PolicyChildrenBinding = KeyedPolicyParentBaseDefinition.makeBinding(
  PolicyChildBlock,
  {
    placement: 'policy-children',
    keySchema: Schema.Number,
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
  },
).withOutMessagePolicy({
  fold: (_key: number, _outMessage: PolicyOutMessage) =>
    SecondaryChildrenBinding.reset(0),
})

const RegisteredKeyedPolicyParent =
  KeyedPolicyParentBaseDefinition.makeComposition({
    bindings: [PolicyChildrenBinding, SecondaryChildrenBinding],
  })
const OmittedKeyedPolicyParentBaseDefinition = makeNamespace(
  'OmittedKeyedPolicyParent',
).makeDefinition({
  Model: ParentModel,
  Message: KeyedPolicyParentMessage,
})
const OmittedSecondaryChildrenBinding =
  OmittedKeyedPolicyParentBaseDefinition.makeBinding(ChildBlock, {
    placement: 'secondary-children',
    keySchema: Schema.Number,
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
  })
const OmittedPolicyChildrenBinding =
  OmittedKeyedPolicyParentBaseDefinition.makeBinding(PolicyChildBlock, {
    placement: 'policy-children',
    keySchema: Schema.Number,
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
  }).withOutMessagePolicy({
    fold: (_key: number, _outMessage: PolicyOutMessage) =>
      OmittedSecondaryChildrenBinding.reset(0),
  })
const AlternateSecondaryChildrenBinding =
  OmittedKeyedPolicyParentBaseDefinition.makeBinding(ChildBlock, {
    placement: 'alternate-secondary',
    keySchema: Schema.Number,
    readAll: model => model.children,
    key: child => child.count,
    read: child => child,
    writeAt: model => model,
  })
const OmittedKeyedPolicyParent =
  // @ts-expect-error A keyed OutMessage policy retains child Step registration.
  OmittedKeyedPolicyParentBaseDefinition.makeComposition({
    bindings: [OmittedPolicyChildrenBinding, AlternateSecondaryChildrenBinding],
  })
const prepareRegisteredKeyedPolicyFold = () =>
  RegisteredKeyedPolicyParent.prepareBlock({
    init: RegisteredKeyedPolicyParent.makeInit(() => ({
      model: makeParentModel(ChildModel.make({ count: 0 })),
    })),
    update: RegisteredKeyedPolicyParent.makeUpdate({
      Ignored: (model, message) =>
        PolicyChildrenBinding.fold(model, 0, message),
      Advanced: (model, message) =>
        PolicyChildrenBinding.fold(model, 0, message),
    }),
    EffectsLayer: Layer.empty,
  })
const registeredKeyedPolicyFold: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredKeyedPolicyFold
> = Block.assemble(prepareRegisteredKeyedPolicyFold)
const FoldOutMessageParentBaseDefinition = makeNamespace(
  'RegisteredFoldOutMessageInitParent',
).makeDefinition({
  Model: ParentModel,
  Message: PolicyParentMessage,
})
const FoldOutMessageChildBinding =
  FoldOutMessageParentBaseDefinition.makeBinding(ChildBlock, {
    placement: 'child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
  })
const FoldOutMessageSecondaryChildBinding =
  FoldOutMessageParentBaseDefinition.makeBinding(ChildBlock, {
    placement: 'secondary-child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
  })
const RegisteredFoldOutMessageParent =
  FoldOutMessageParentBaseDefinition.makeComposition({
    bindings: [FoldOutMessageChildBinding, FoldOutMessageSecondaryChildBinding],
  })
const OmittedFoldOutMessageParentBaseDefinition = makeNamespace(
  'OmittedFoldOutMessageInitParent',
).makeDefinition({
  Model: ParentModel,
  Message: PolicyParentMessage,
})
const OmittedFoldOutMessageChildBinding =
  OmittedFoldOutMessageParentBaseDefinition.makeBinding(ChildBlock, {
    placement: 'child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
  })
const AlternateInitPrimaryBinding =
  OmittedFoldOutMessageParentBaseDefinition.makeBinding(ChildBlock, {
    field: 'child',
    placement: 'alternate-primary',
    init: false,
  })
const AlternateInitSecondaryBinding =
  OmittedFoldOutMessageParentBaseDefinition.makeBinding(ChildBlock, {
    field: 'child',
    placement: 'alternate-secondary',
    init: false,
  })
const OmittedFoldOutMessageParent =
  OmittedFoldOutMessageParentBaseDefinition.makeComposition({
    bindings: [AlternateInitPrimaryBinding, AlternateInitSecondaryBinding],
  })
const prepareRegisteredFoldOutMessageInit = () =>
  RegisteredFoldOutMessageParent.prepareBlock({
    init: RegisteredFoldOutMessageParent.makeInit(() =>
      FoldOutMessageChildBinding.init({
        args: [],
        toParentModel: makeParentModel,
      }),
    ),
    update: RegisteredFoldOutMessageParent.makeUpdate({
      Ignored: model => ({ model }),
      Advanced: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const registeredFoldOutMessageInit: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRegisteredFoldOutMessageInit
> = Block.assemble(prepareRegisteredFoldOutMessageInit)
const prepareOmittedFoldOutMessageInit = () =>
  // @ts-expect-error A passive init recipe requires its registered child Binding at completion.
  OmittedFoldOutMessageParent.prepareBlock({
    init: OmittedFoldOutMessageParent.makeInit(() =>
      OmittedFoldOutMessageChildBinding.init({
        args: [],
        toParentModel: makeParentModel,
      }),
    ),
    update: OmittedFoldOutMessageParent.makeUpdate({
      Ignored: model => ({ model }),
      Advanced: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const omittedFoldOutMessageInit: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareOmittedFoldOutMessageInit
> = Block.assemble(prepareOmittedFoldOutMessageInit)
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

const LifecycleNamespace = makeNamespace('RegistrationLifecycleChild')
const LifecycleDefinition = LifecycleNamespace.makeDefinition({
  Model: ChildModel,
  Message: Schema.Never,
})
const lifecycleSubscriptions = LifecycleDefinition.makeSubscriptions(entry => ({
  idle: entry('Idle', {
    messages: [],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))
const LifecycleComposition = LifecycleDefinition.makeComposition()
const prepareLifecycleChild = () =>
  LifecycleComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ count: 0 }) }),
    update: LifecycleComposition.makeUpdate({}),
    subscriptions: lifecycleSubscriptions,
    EffectsLayer: lifecycleSubscriptions.idle.layer,
  })
const LifecycleChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareLifecycleChild
> = Block.assemble(prepareLifecycleChild)
const LifecycleOnlyParentBaseDefinition = makeNamespace(
  'LifecycleOnlyChildParent',
).makeDefinition({
  Model: ParentModel,
  Message,
})
const LifecycleChildBinding = LifecycleOnlyParentBaseDefinition.makeBinding(
  LifecycleChild,
  {
    placement: 'lifecycle-child',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model, nextChild) =>
      ParentModel.make({ ...model, child: nextChild }),
  },
)

const LifecycleOnlyParent = LifecycleOnlyParentBaseDefinition.makeComposition({
  bindings: [LifecycleChildBinding],
})
const RemovedLifecycleParent = makeNamespace('RemovedLifecycleChildParent')
  .makeDefinition({
    Model: ParentModel,
    Message,
  })
  .makeComposition()
const prepareLifecycleOnlyChild = () =>
  LifecycleOnlyParent.prepareBlock({
    init: () => ({ model: makeParentModel(ChildModel.make({ count: 0 })) }),
    update: LifecycleOnlyParent.makeUpdate({
      RequestedReset: model => ({ model }),
      Ignored: model => ({ model }),
      Advanced: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const lifecycleOnlyChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareLifecycleOnlyChild
> = Block.assemble(prepareLifecycleOnlyChild)
const prepareRemovedLifecycleChild = () =>
  RemovedLifecycleParent.prepareBlock({
    init: () => ({ model: makeParentModel(ChildModel.make({ count: 0 })) }),
    update: RemovedLifecycleParent.makeUpdate({
      RequestedReset: model => ({ model }),
      Ignored: model => ({ model }),
      Advanced: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
const removedLifecycleChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareRemovedLifecycleChild
> = Block.assemble(prepareRemovedLifecycleChild)

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
void assembleOmittedDynamicCombinedStep
void registeredInit
void omittedInit
void registeredDefinitionUpdate
void omittedDefinitionUpdate
void genericUpdate
void registeredBranchUpdate
void assembleOmittedBranchUpdate
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
void OmittedPolicyParent
void registeredKeyedPolicyFold
void OmittedKeyedPolicyParent
void registeredFoldOutMessageInit
void omittedFoldOutMessageInit
void lifecycleOnlyChild
void removedLifecycleChild

it('keeps the declared child graph independent from operation use', () => {
  expect(registeredFold.bindings).toEqual([ChildBinding])
  expect(removedUnusedChild.bindings).toEqual([])
  expect(lifecycleOnlyChild.bindings).toEqual([LifecycleChildBinding])
  expect(removedLifecycleChild.bindings).toEqual([])
  expectTypeOf<
    Update.RegistrationEvidenceOf<ReturnType<typeof childResultWithOutMessage>>
  >().toEqualTypeOf<RequirementOfBinding<typeof ChildBinding>>()
  expectTypeOf<
    Update.RequirementsOf<typeof childResultWithOutMessage>
  >().toEqualTypeOf<never>()
})

it('preserves connected Steps beside generic no-op Steps', () => {
  const model = makeParentModel(ChildModel.make({ count: 4 }))

  expect(
    explicitGenericOrdinaryUpdate(model, ParentMessage.Advanced()).model,
  ).toBe(model)

  for (const mixedUpdate of [
    mixedConnectedUpdate,
    reversedMixedConnectedUpdate,
    tupleMixedConnectedUpdate,
    deferredMixedConnectedUpdate,
  ]) {
    expect(mixedUpdate(model, ParentMessage.Advanced()).model.child.count).toBe(
      0,
    )
  }

  expectTypeOf<
    Update.ResolvedOperationOutput<
      ReturnType<typeof combinedMixedConnectedStep>
    >
  >().toEqualTypeOf<
    Update.ResolvedOperationOutput<
      ReturnType<ReturnType<typeof ChildBinding.reset>>
    >
  >()
  expectTypeOf<ReturnType<typeof deferredMixedConnectedStep>>().toEqualTypeOf<
    ReturnType<ReturnType<typeof ChildBinding.reset>>
  >()
  expectTypeOf<
    Update.RegistrationEvidenceOf<ReturnType<typeof mixedConnectedUpdate>>
  >().toEqualTypeOf<RequirementOfBinding<typeof ChildBinding>>()
  expectTypeOf<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof reversedMixedConnectedUpdate>
    >
  >().toEqualTypeOf<RequirementOfBinding<typeof ChildBinding>>()
  expectTypeOf<ReturnType<typeof tupleMixedConnectedUpdate>>().toEqualTypeOf<
    ReturnType<typeof mixedConnectedUpdate>
  >()
  expectTypeOf<ReturnType<typeof deferredMixedConnectedUpdate>>().toEqualTypeOf<
    ReturnType<typeof mixedConnectedUpdate>
  >()
  expectTypeOf<
    Update.RequirementsOf<typeof explicitGenericOrdinaryUpdate>
  >().toEqualTypeOf<never>()
})

it('resolves a mixed connected Step through its OutMessage policy', () => {
  const model = makeParentModel(ChildModel.make({ count: 4 }))
  const result = mixedPolicyUpdate(model, PolicyParentMessage.Advanced())

  expect(result.model.child.count).toBe(0)
  expectTypeOf<Update.RegistrationEvidenceOf<typeof result>>().toEqualTypeOf<
    | RequirementOfBinding<typeof PolicyChildBinding>
    | RequirementOfBinding<typeof SecondaryChildBinding>
  >()
  expectTypeOf<
    Update.RequirementsOf<typeof mixedPolicyUpdate>
  >().toEqualTypeOf<never>()
})

it('preserves the Model when combining no Steps', () => {
  const model = ChildModel.make({ count: 4 })
  const combined = Update.combineSteps(model, [])

  expect(combined.model).toBe(model)
  expect(combined.commands).toBeUndefined()
  expectTypeOf<typeof combined.model>().toEqualTypeOf<ChildModel>()
})

it('contextually types ordinary inline Steps', () => {
  const model = ChildModel.make({ count: 4 })
  const single = Update.combineSteps(model, [
    stepModel => {
      expectTypeOf<typeof stepModel>().toEqualTypeOf<ChildModel>()
      return { model: stepModel }
    },
  ])
  const pair = Update.combineSteps(model, [
    stepModel => {
      expectTypeOf<typeof stepModel>().toEqualTypeOf<ChildModel>()
      return { model: stepModel }
    },
    stepModel => {
      expectTypeOf<typeof stepModel>().toEqualTypeOf<ChildModel>()
      return { model: stepModel }
    },
  ])

  expect(single.model).toBe(model)
  expect(pair.model).toBe(model)
  expectTypeOf<typeof single.model>().toEqualTypeOf<ChildModel>()
  expectTypeOf<typeof pair.model>().toEqualTypeOf<ChildModel>()
})
