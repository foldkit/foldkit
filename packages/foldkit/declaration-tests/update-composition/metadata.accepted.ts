import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import type * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import type * as Update from 'foldkit/update'

import { SaveDraft } from './command.js'
import { makeUpdate } from './composition.js'
import * as Editor from './editor.js'
import type { PlanOutput } from './types.js'
import { editDocument, update } from './update.js'

export const MessageFreeKey = Symbol('MessageFreeComposition')
export const MessageFreeBlock = Block.make('MessageFreeComposition', {
  key: MessageFreeKey,
  Model: Schema.Struct({ count: Schema.Number }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  isMessageFree: true,
})
const MessageFreeComposition = MessageFreeBlock.makeComposition()
export const messageFreeUpdate = MessageFreeComposition.makeUpdate.compose(
  MessageFreeComposition.makeUpdate({}),
)
export const messageFreeLayer = MessageFreeBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: MessageFreeComposition.makeInit(() => ({ model: { count: 0 } })),
    update: messageFreeUpdate,
  }),
)

export const RoutedKey = Symbol('RoutedComposition')
export const RoutedBlock = Block.make('RoutedComposition', {
  key: RoutedKey,
  Model: Schema.Struct({ editor: Editor.EditorBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
const RoutedEditorBinding = RoutedBlock.makeRequiredFieldBinding(
  Editor.EditorBlock,
  {
    field: 'editor',
  },
).withOutMessagePolicy({
  fold: RoutedBlock.makeOutMessageFold(Editor.EditorBlock, {
    Edited: RoutedBlock.makeNoopStep,
  }),
})
const RoutedComposition = RoutedBlock.makeComposition({
  bindings: [RoutedEditorBinding],
})
export const routedUpdate = RoutedComposition.makeUpdate.compose(
  RoutedComposition.makeUpdate({}),
)
export const routedLayer = RoutedBlock.makeLayer(
  Effect.gen(function* () {
    const editor = yield* RoutedEditorBinding

    return {
      children: [editor],
      init: RoutedComposition.makeInit(() => ({ model: {} })),
      update: routedUpdate,
    }
  }),
).pipe(Layer.provide(Editor.layer))

const FamilyMessage = defineMessageUnion({ CompletedRefresh: {} })
export const GenericKey = Symbol('GenericComposition')
export const makeGenericUpdate = <Value, Encoded>(
  value: Schema.Codec<Value, Encoded, never, never>,
) => {
  const Definition = Block.makeFamilyDefinition('GenericComposition', {
    key: GenericKey,
    Model: Schema.Struct({ value }),
    Message: FamilyMessage,
    InitArgs: Schema.Tuple([value]),
  })
  const Composition = Definition.makeComposition()
  const update = Composition.makeUpdate({
    CompletedRefresh: Definition.makeNoopStep(),
  })

  return Composition.makeUpdate.compose(update)
}

export const numberUpdate = makeGenericUpdate(Schema.Number)

export const makeConditionalUpdates = (isEnabled: boolean) => {
  const quiet = makeUpdate.each(model => ({ model }))
  const persist = makeUpdate.each(model => ({
    model,
    commands: [SaveDraft({ text: model.title })],
  }))
  const focusedParts: ReadonlyArray<typeof quiet | typeof persist> = [
    quiet,
    persist,
  ]
  const selectedComplete = isEnabled ? editDocument : update

  return {
    conditionalFocused: makeUpdate.compose(
      editDocument,
      isEnabled ? persist : quiet,
    ),
    conditionalComplete: makeUpdate.compose(selectedComplete),
    arrayFocused: makeUpdate.compose(editDocument, ...focusedParts),
  }
}

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Condition extends true> = Condition
type ConditionalUpdates = ReturnType<typeof makeConditionalUpdates>
type ExpectedRequirements =
  | Update.RequirementsOf<PlanOutput<typeof editDocument>>
  | Command.HandlerOf<typeof SaveDraft>

export type ConditionalStagesKeepCommands = Expect<
  Equal<
    Update.RequirementsOf<PlanOutput<ConditionalUpdates['conditionalFocused']>>,
    ExpectedRequirements
  >
>
export type RepeatedFocusedStagesKeepCommands = Expect<
  Equal<
    Update.RequirementsOf<PlanOutput<ConditionalUpdates['arrayFocused']>>,
    ExpectedRequirements
  >
>
