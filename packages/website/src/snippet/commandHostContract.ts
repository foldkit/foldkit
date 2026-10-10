import { Effect, Schema } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedSaveDocument: {},
})

export const SaveDocument = Command.define('SaveDocument', {
  args: { contents: Schema.String },
  messages: [Message.CompletedSaveDocument],
})

export const makeSaveDocumentLayer = (
  saveDocument: (contents: string) => Effect.Effect<void>,
) =>
  SaveDocument.toLayer(
    Effect.succeed(({ contents }) =>
      saveDocument(contents).pipe(Effect.as(Message.CompletedSaveDocument())),
    ),
  )
