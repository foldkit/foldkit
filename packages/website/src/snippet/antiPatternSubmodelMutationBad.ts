// ❌ Bad: the parent changes the Settings Model directly.

import type { Update } from 'foldkit'

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedResetSettings: () => ({
      model: evo(model, {
        settings: settings => evo(settings, { theme: () => 'Light' }),
      }),
    }),
  })
