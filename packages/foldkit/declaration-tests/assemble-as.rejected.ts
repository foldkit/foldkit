// Each mutation must be rejected by assembleAs itself, through contract
// exactness or an existing assembly validator. Mutations stay on one line so
// each directive covers the whole call; the formatter ignores this file.
import { Effect, Layer } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  Audit,
  CounterBinding,
  CounterBlock,
  EffectsLayer,
  Observe,
  ParentComposition,
  ParentDefinition,
  ParentMessage,
  ParentModel,
  Record,
  Save,
  init,
  update,
  view,
} from './assemble-as.accepted.js'
import type {
  ParentDispatch,
  ParentImplementation,
  ParentInit,
  ParentLocalLayer,
  ParentUpdateRequirements,
  ParentView,
} from './assemble-as.accepted.js'

type Model = typeof ParentModel.Type
type Dispatch = ParentDispatch['Type']
type ActualRequirements = Update.RequirementsOf<typeof update>
type ActualEvidence = Update.RegistrationEvidenceOf<ReturnType<typeof update>>
type ContractUpdate<Requirements> = {
  (
    message: Dispatch,
  ): (model: Model) => Update.Return<Model, Dispatch, Requirements>
  (model: Model, message: Dispatch): Update.Return<Model, Dispatch, Requirements>
}
type WithUpdate<Requirements> = Omit<ParentImplementation, 'update'> &
  Readonly<{ update: ContractUpdate<Requirements> }>
type WithLayer<LayerValue> = Omit<ParentImplementation, 'EffectsLayer'> &
  Readonly<{ EffectsLayer: LayerValue }>

const AuditInput = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* Audit
  }),
)
class ChangedConstructorError {
  readonly _tag = 'ChangedConstructorError'
}
const FailingConstructor = Layer.effectDiscard(
  Effect.fail(new ChangedConstructorError()),
)
const OtherObserve = ParentDefinition.makeMount('OtherObserve', {
  messages: [ParentMessage.Observed],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.Observed())
  },
})
const OtherCounterBinding = ParentDefinition.makeBinding(CounterBlock, {
  field: 'counter',
  placement: 'otherCounter',
  init: { contextToArgs: () => [] },
})
const WithoutCounter = ParentDefinition.makeComposition({ mounts: [Observe] })
const ForeignMounts = ParentDefinition.makeComposition({
  mounts: [OtherObserve],
  bindings: [CounterBinding],
})
const foreignView = ForeignMounts.makeView((model, h) =>
  h.div([h.OnMount(OtherObserve())], [model.note]),
)
const neverUpdate = (() => {
  throw new Error('never producer')
})()
declare const refinedUpdate: Block.DefinedUpdate<
  Model,
  Exclude<Dispatch, Readonly<{ _tag: 'Saved' }>>,
  [],
  never,
  ActualRequirements,
  ActualEvidence
>
declare const unregisteredUpdate: Block.DefinedUpdate<
  Model,
  Dispatch,
  [],
  never,
  ActualRequirements,
  ActualEvidence | Block.RequirementOfBinding<typeof OtherCounterBinding>
>

// 1. Constructor Service added to the implementation Layer.
// @ts-expect-error The implementation Layer requires a Service the contract omits.
export const addedService = ParentComposition.assembleAs<ParentImplementation>()({ init, update, view, EffectsLayer: Layer.mergeAll(EffectsLayer, AuditInput) })
// 2. Refined update input.
// @ts-expect-error A refined update input cannot satisfy the exact contract.
export const refinedInput = ParentComposition.assembleAs<ParentImplementation>()({ init, update: refinedUpdate, view, EffectsLayer })
// 3. Removed Binding.
// @ts-expect-error The contract and producers belong to a graph with the counter Binding.
export const removedBinding = WithoutCounter.assembleAs<ParentImplementation>()({ init, update, view, EffectsLayer })
// 4. Changed constructor error.
// @ts-expect-error A constructor error absent from the contract is rejected.
export const changedError = ParentComposition.assembleAs<ParentImplementation>()({ init, update, view, EffectsLayer: Layer.mergeAll(EffectsLayer, FailingConstructor) })
// 5. never producer.
// @ts-expect-error A never update is not an exact producer.
export const neverProducer = ParentComposition.assembleAs<ParentImplementation>()({ init, update: neverUpdate, view, EffectsLayer })
// 6. never contract.
// @ts-expect-error A never contract cannot certify an implementation.
export const neverContract = ParentComposition.assembleAs<never>()({ init, update, view, EffectsLayer })
// 7. Paired never contract and never producer.
// @ts-expect-error Paired never contract and producer are rejected.
export const pairedNever = ParentComposition.assembleAs<never>()({ init, update: neverUpdate, view, EffectsLayer })
// 8. Under-declared update requirements: the contract omits Save's handler.
// @ts-expect-error The contract cannot erase a requirement the update has.
export const underDeclared = ParentComposition.assembleAs<WithUpdate<Exclude<ParentUpdateRequirements, Command.HandlerOf<typeof Save>>>>()({ init, update, view, EffectsLayer })
// 9. Over-declared update requirements: the contract adds Record's handler.
// @ts-expect-error The contract cannot declare a requirement the update lacks.
export const overDeclared = ParentComposition.assembleAs<WithUpdate<ParentUpdateRequirements | Command.HandlerOf<typeof Record>>>()({ init, update, view, EffectsLayer })
// 10. Over-declared Layer input Service.
// @ts-expect-error The contract cannot declare a Layer Service the implementation lacks.
export const overDeclaredService = ParentComposition.assembleAs<WithLayer<Layer.Layer<Layer.Success<ParentLocalLayer>, never, Layer.Services<ParentLocalLayer> | Audit>>>()({ init, update, view, EffectsLayer })
// 11. Over-declared init arguments.
// @ts-expect-error The contract cannot add init arguments the implementation ignores.
export const overDeclaredInit = ParentComposition.assembleAs<Omit<ParentImplementation, 'init'> & Readonly<{ init: (...args: [extra: string]) => ReturnType<ParentInit> }>>()({ init, update, view, EffectsLayer })
// 12. Missing handler, with a contract that exactly matches the incomplete Layer.
// @ts-expect-error Save's handler is neither provided locally nor listed in hostHandlers.
export const missingHandler = ParentComposition.assembleAs<WithLayer<typeof Observe.layer>>()({ init, update, view, EffectsLayer: Observe.layer })
// 13. Unregistered Binding, with registration evidence hidden from the public contract.
// @ts-expect-error The update uses a Binding the Composition does not register.
export const unregisteredBinding = ParentComposition.assembleAs<ParentImplementation>()({ init, update: unregisteredUpdate, view, EffectsLayer })
// 14. Unregistered Mount, with a contract that exactly matches the foreign view.
// @ts-expect-error The view uses a Mount the Composition does not register.
export const unregisteredMount = ParentComposition.assembleAs<Omit<ParentImplementation, 'view'> & Readonly<{ view: typeof foreignView }>>()({ init, update, view: foreignView, EffectsLayer })
// 15. Extra implementation key.
// @ts-expect-error assembleAs keeps assembleBlock's exact implementation keys.
export const extraKey = ParentComposition.assembleAs<ParentImplementation>()({ init, update, view, EffectsLayer, expose: {} })
// 16. A contract view with an extra member fails the reverse direction.
// @ts-expect-error The view contract is checked against the supplied view.
export const contractView = ParentComposition.assembleAs<Omit<ParentImplementation, 'view'> & Readonly<{ view: ParentView & Readonly<{ extra: true }> }>>()({ init, update, view, EffectsLayer })
