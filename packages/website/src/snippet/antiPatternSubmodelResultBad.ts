// ❌ Bad: manual copying drops the Commands returned with the child Model.

import type { Update } from 'foldkit'

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedResetSettings: () => {
      const settingsReset = Settings.setTheme(model.settings, 'Light')

      return {
        model: evo(model, {
          settings: () => settingsReset.model,
        }),
      }
    },
  })
