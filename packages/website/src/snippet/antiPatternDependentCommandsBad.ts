// ❌ Bad: both Commands start independently.

import { Update } from 'foldkit'

const update = Update.define((model: Model, message: Message) =>
  Message.match(message, {
    ClickedSave: () => ({
      model,
      commands: [SaveDraft(), NavigateToDocuments()],
    }),
  }),
)
