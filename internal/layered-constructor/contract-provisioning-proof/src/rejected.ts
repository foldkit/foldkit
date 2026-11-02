import { Context, Effect, Layer, Schema } from 'effect'
import { Program, Runtime } from 'foldkit'
import * as Contracted from 'foldkit/experimental/contracted'
import { defineMessageUnion } from 'foldkit/message'
import * as Update from 'foldkit/update'

import {
  Block,
  ChildBinding,
  Contract,
  ParentBlock,
  ProvidedParent,
} from './basic'

class Audit extends Context.Service<
  Audit,
  Readonly<{ record: Effect.Effect<void> }>
>()('ContractedAudit') {}

const Model = Schema.Struct({ value: Schema.String })
const Message = defineMessageUnion({ Submitted: {}, CompletedSave: {} })
const OutMessage = defineMessageUnion({ Saved: { value: Schema.String } })

export const SilentContractKey = Symbol('SilentContract')
const SilentDefinition = Contracted.makeDefinition('SilentContract', {
  key: SilentContractKey,
  Model,
  Message,
  OutMessage,
  Init: Schema.Tuple([]),
  operations: { submit: Message.Submitted },
})
const SilentComposition = SilentDefinition.makeComposition()
const silentInit = SilentComposition.makeInit(() => ({ model: { value: '' } }))
const emittingUpdate = SilentComposition.makeUpdate({
  Submitted: model => ({
    model,
    outMessage: OutMessage.Saved({ value: model.value }),
  }),
  CompletedSave: SilentDefinition.makeNoopStep(),
})
// @ts-expect-error A declared silent operation cannot discard an emitted OutMessage.
SilentDefinition.makeBlock(
  Effect.succeed({ children: [], init: silentInit, update: emittingUpdate }),
)

export const MissingHandlerServiceKey = Symbol('MissingHandlerService')
const NeedsAuditDefinition = Contracted.makeDefinition(
  'MissingHandlerService',
  { key: MissingHandlerServiceKey, Model, Message, Init: Schema.Tuple([]) },
)
const NeedsAuditComposition = NeedsAuditDefinition.makeComposition()
const Save = NeedsAuditDefinition.makeCommand('Save', {
  messages: [Message.CompletedSave],
  handler: function* () {
    const audit = yield* Audit
    return () => audit.record.pipe(Effect.as(Message.CompletedSave()))
  },
})
const needsAuditInit = NeedsAuditComposition.makeInit(() => ({
  model: { value: '' },
}))
const needsAuditUpdate = NeedsAuditComposition.makeUpdate({
  Submitted: NeedsAuditDefinition.makeCommandsStep(() => [Save()]),
  CompletedSave: NeedsAuditDefinition.makeNoopStep(),
})
// @ts-expect-error The implementation has an undeclared lazy handler Service requirement.
NeedsAuditDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: needsAuditInit,
    update: needsAuditUpdate,
    EffectsLayer: Save.layer,
  }),
)
// @ts-expect-error An attached handler's original registration evidence must be provided.
NeedsAuditDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: needsAuditInit,
    update: needsAuditUpdate,
    EffectsLayer: Layer.empty,
  }),
)

export const InvocationServiceKey = Symbol('InvocationService')
const InvocationDefinition = Contracted.makeDefinition('InvocationService', {
  key: InvocationServiceKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  effects: { services: [Audit] },
})
const InvocationComposition = InvocationDefinition.makeComposition()
const invocationInit = InvocationComposition.makeInit(() => ({
  model: { value: '' },
}))
const invocationUpdate = InvocationComposition.makeUpdate({
  Submitted: model => ({
    model,
    commands: [
      {
        name: 'DirectAudit',
        effect: Effect.flatMap(Audit, service => service.record).pipe(
          Effect.as(Message.CompletedSave()),
        ),
      },
    ],
  }),
  CompletedSave: InvocationDefinition.makeNoopStep(),
})
// @ts-expect-error A lazy handler budget cannot erase a Command's ordinary invocation dependency.
InvocationDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: invocationInit,
    update: invocationUpdate,
  }),
)

export const WrongContractViewKey = Symbol('WrongContractView')
const WrongViewDefinition = Contracted.makeDefinition('WrongContractView', {
  key: WrongContractViewKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Schema.Struct({ label: Schema.String }) },
})
const WrongViewComposition = WrongViewDefinition.makeComposition()
const wrongViewInit = WrongViewComposition.makeInit(() => ({
  model: { value: '' },
}))
const wrongViewUpdate = WrongViewComposition.makeUpdate({
  Submitted: WrongViewDefinition.makeNoopStep(),
  CompletedSave: WrongViewDefinition.makeNoopStep(),
})
const missingInputsView = WrongViewComposition.makeView((model, h) =>
  h.p([], [model.value]),
)
// @ts-expect-error The implementation cannot omit the public view inputs.
WrongViewDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: wrongViewInit,
    update: wrongViewUpdate,
    view: missingInputsView,
  }),
)
export const inferredInputView = WrongViewComposition.makeView.withInputs(
  (model, { label }, h) => {
    // @ts-expect-error View input properties retain their exact Schema types.
    const invalidLabel: number = label
    void invalidLabel

    return h.p([], [label, model.value])
  },
)
export const ViewInputsBlock = WrongViewDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: wrongViewInit,
    update: wrongViewUpdate,
    view: inferredInputView,
  }),
)

// @ts-expect-error An implementation is supplied through Layers, not used as a contract declaration.
SilentDefinition.makeBinding(Block, { field: 'value' })

Effect.gen(function* () {
  const wrongChild = yield* SilentDefinition.contract.get
  // @ts-expect-error Connections preserve the exact child contract.
  ChildBinding.connect(wrongChild)

  const child = yield* Contract.get
  // @ts-expect-error An unhandled public OutMessage cannot enter combineSteps.
  Update.combineSteps([child.operations.submit])
})

const pending = Program.makeElement({ block: ProvidedParent, container: null })
// @ts-expect-error The root retains its declared lazy Send Service requirement.
Runtime.run(pending)

// @ts-expect-error The child graph implementation has not been supplied.
Effect.runPromise(ParentBlock.get.pipe(Effect.provide(ParentBlock.layer)))

export const ForeignContractKey = Symbol('ForeignContract')
const ForeignDefinition = Contracted.makeDefinition('ForeignContract', {
  key: ForeignContractKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
})
const ForeignComposition = ForeignDefinition.makeComposition()
const foreignInit = ForeignComposition.makeInit(() => ({
  model: { value: '' },
}))
const foreignUpdate = ForeignComposition.makeUpdate({
  Submitted: ForeignDefinition.makeNoopStep(),
  CompletedSave: ForeignDefinition.makeNoopStep(),
})
// @ts-expect-error Foreign authoring plans cannot be completed as this Definition.
NeedsAuditDefinition.makeBlock(
  Effect.succeed({ children: [], init: foreignInit, update: foreignUpdate }),
)

void Contract
