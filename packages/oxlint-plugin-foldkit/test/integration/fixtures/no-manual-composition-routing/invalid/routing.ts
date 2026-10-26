import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  GotDialogMessage: { message: Dialog.Message },
  GotExtractedMessage: { message: Extracted.Message },
  GotInlineMessage: { message: Inline.Message },
  GotPickerEvent: { event: Picker.Message },
  ClickedSave: {},
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

ApplicationDefinition.makeBinding(DialogBlock, {
  field: 'dialog',
  parentMessage: Message.GotDialogMessage,
  fromParentMessage: false,
})

ApplicationDefinition.makeBinding(PickerBlock, {
  field: 'picker',
  toParentMessage: message => Message.GotPickerEvent({ event: message }),
})

const ApplicationComposition = ApplicationDefinition.makeComposition()

const extractedHandlers = {
  GotExtractedMessage: () => ({ model: Model.make({}) }),
  ClickedSave: () => ({ model: Model.make({}) }),
}

ApplicationComposition.makeUpdate(extractedHandlers)

ApplicationComposition.makeUpdate({
  GotInlineMessage: model => ({ model }),
  ClickedSave: model => ({ model }),
})

ApplicationComposition.makeUpdate({
  GotPickerEvent: model => ({ model }),
})

const broadCases = {
  GotDialogMessage: (model: unknown) => ({ model }),
  ClickedSave: (model: unknown) => ({ model }),
}

ApplicationComposition.makeUpdate(broadCases)

ApplicationComposition.makeUpdate({
  ClickedSave: (model, message) =>
    message.message._tag === 'ChangedDialog' ? { model } : { model },
})

const makeContextualCases = (_context: string) => ({
  ClickedSave: (model: unknown, message: { message: { _tag: string } }) =>
    message.message._tag === 'ChangedDialog' ? { model } : { model },
})

ApplicationComposition.makeUpdate.withContext(makeContextualCases)
