import {
  KeyedComposition,
  KeyedBinding,
  ParentModel,
  ParentComposition,
  ParentDefinition,
  ParentMessage,
  ParentOutMessage,
  ChildBinding,
  LocalSave,
} from './callback-guard.accepted.js'
const keepModel = ParentDefinition.makeNoopStep()
const validHandlers = {
  IgnoredRequest: keepModel,
  RequestedChildIncrement: keepModel,
  RequestedLocalSave: keepModel,
  RequestedReport: keepModel,
  CompletedLocalSave: keepModel,
}
ParentComposition.makeUpdate({
  IgnoredRequest: keepModel,
  RequestedChildIncrement: ChildBinding.requestIncrement(),
  RequestedLocalSave: ParentDefinition.makeCommandsStep(() => [LocalSave()]),
  RequestedReport: ParentDefinition.makeOutMessageStep(() =>
    ParentOutMessage.Reported(),
  ),
  CompletedLocalSave: keepModel,
})

ParentComposition.makeUpdate({
  ...validHandlers,
  // @ts-expect-error Raw local returns must retain their channels beside a connected result in one handler.
  RequestedChildIncrement: model =>
    model.child.count > 0 ? ChildBinding.requestIncrement()(model) : { model },
})
ParentComposition.makeUpdate({
  ...validHandlers,
  // @ts-expect-error Both absent-channel keys are required, even without a raw no-op branch.
  RequestedChildIncrement: model =>
    model.child.count > 0
      ? ChildBinding.requestIncrement()(model)
      : { model, commands: [LocalSave()] },
})
ParentComposition.makeUpdate({
  ...validHandlers,
  // @ts-expect-error Raw OutMessage-only results must also be authored as owned Steps beside recipes.
  RequestedChildIncrement: model =>
    model.child.count > 0
      ? ChildBinding.requestIncrement()(model)
      : { model, outMessage: ParentOutMessage.Reported() },
})
ParentComposition.makeUpdate({
  ...validHandlers,
  // @ts-expect-error Binding init recipes retain the same mixture restriction.
  RequestedChildIncrement: model =>
    model.child.count > 0
      ? ChildBinding.init({
          args: [],
          toParentModel: child => ({ ...model, child }),
        })
      : { model },
})
KeyedComposition.makeUpdate({
  ...validHandlers,
  // @ts-expect-error Keyed delivery cannot bypass canonical ordinary local result channels.
  RequestedChildIncrement: model =>
    model.children.length > 0
      ? KeyedBinding.requestIncrement('current')(model)
      : { model },
})
type RawLocalReturn = { model: typeof ParentModel.Type }
type ChildResult = ReturnType<ReturnType<typeof ChildBinding.requestIncrement>>
ParentComposition.makeUpdate({
  ...validHandlers,
  // @ts-expect-error Explicit unions must preserve ordinary result channels too.
  RequestedChildIncrement: (model): RawLocalReturn | ChildResult =>
    model.child.count > 0 ? ChildBinding.requestIncrement()(model) : { model },
})
