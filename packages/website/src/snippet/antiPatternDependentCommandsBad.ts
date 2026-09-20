// ❌ Bad: both Commands start independently.

import type { Update } from 'foldkit'

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSave: () => ({
      model,
      commands: [SaveDraft(), NavigateToDocuments()],
    }),
  })
