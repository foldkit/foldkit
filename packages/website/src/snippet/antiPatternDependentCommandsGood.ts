// ✅ Good: update returns NavigateToDocuments after SaveDraft succeeds.

import type { Update } from 'foldkit'

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSave: () => ({
      model,
      commands: [SaveDraft()],
    }),

    SucceededSaveDraft: () => ({
      model,
      commands: [NavigateToDocuments()],
    }),
  })
