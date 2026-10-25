import { Option } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { foreignComposition, foreignDefinition } from 'third-party'

const Message = defineMessageUnion({
  ClickedSave: {},
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

defineMessageUnion({ ChangedSettings: {} })

ApplicationDefinition.makeBinding(SilentBlock, { field: 'silent' })

ApplicationDefinition.makeBinding(DialogBlock, {
  field: 'dialog',
})

ApplicationDefinition.makeBinding(PickerBlock, {
  field: 'picker',
  delivery: {
    when: model => Option.isSome(model.maybePicker),
  },
})

const sharedMapping = {
  field: 'shared',
}

ApplicationDefinition.makeBinding(SharedBlock, { ...sharedMapping })

const ApplicationComposition = ApplicationDefinition.makeComposition()

ApplicationComposition.makeUpdate({
  ClickedSave: model => ({ model }),
})

ApplicationComposition.makeUpdate({
  ClickedSave: (model, message) =>
    message._tag === 'ClickedSave' ? { model } : { model },
})

ApplicationComposition.makeUpdate({
  ClickedSave: (model, message) => {
    const inspectLocalMessage = (message: { _tag: string }) =>
      message._tag === 'GotLocalMessage'
    inspectLocalMessage({ _tag: message._tag })

    return { model }
  },
})

DialogBinding.fold(model, message)

foreignComposition.makeUpdate((model, message) =>
  ParentMessage.match(message, {
    GotForeignMessage: () => ({ model }),
  }),
)

const localForeignComposition = foreignDefinition.makeComposition()
localForeignComposition.makeUpdate((model, message) =>
  ParentMessage.match(message, {
    GotForeignMessage: () => ({ model }),
  }),
)

ApplicationComposition.makeUpdate({
  ClickedSave: (model: unknown) => ({ model }),
})

ApplicationComposition.makeUpdate.withContext((_context: string) => ({
  ClickedSave: (model: unknown) => ({ model }),
}))

const unrelated = {
  makeUpdate: Object.assign((cases: unknown) => cases, {
    withContext: (createCases: unknown) => createCases,
  }),
}

unrelated.makeUpdate({
  GotUnrelatedMessage: (model: unknown) => ({ model }),
})

unrelated.makeUpdate.withContext(() => ({
  GotUnrelatedMessage: (model: unknown, message: { message: { _tag: string } }) =>
    message.message._tag === 'ChangedChild' ? { model } : { model },
}))
