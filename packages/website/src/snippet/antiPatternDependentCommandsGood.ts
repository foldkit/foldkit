// ✅ Good: update returns NavigateToDocuments after SaveDraft succeeds.

import { Update } from 'foldkit'

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedSave: () => ({
      model,
      commands: [SaveDraft()],
    }),

    SucceededSaveDraft: () => ({
      model,
      commands: [NavigateToDocuments()],
    }),
  }),
)
