import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { ThemeMenu } from './subscriptionOrganizationThemeMenu'

const Page = defineTaggedUnion({
  Home: {},
  Settings: { themeMenu: ThemeMenu },
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ page: Page }),
  Message: defineMessageUnion({ ClickedHome: {}, ClickedSettings: {} }),
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const themeMenu = yield* new ThemeMenu('themeMenu')

    return {
      model: { page: Page.Home() },

      update: {
        ClickedHome: model => ({
          model: modifyFields(model, { page: () => Page.Home() }),
        }),
        ClickedSettings: model => ({
          model: modifyFields(model, {
            page: () => Page.Settings({ themeMenu }),
          }),
        }),
      },
    }
  }),
)
