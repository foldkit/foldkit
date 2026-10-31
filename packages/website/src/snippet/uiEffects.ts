import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog, Menu } from '@foldkit/ui'

const AccountMenu = Menu.makeBlock<'Profile' | 'Sign out'>()

const Message = defineMessageUnion({
  ClickedOpenSettings: {},
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({
    settingsDialog: Dialog.Dialog,
    accountMenu: AccountMenu,
  }),
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const settingsDialog = yield* new Dialog.Dialog('settingsDialog', {
      id: 'settings',
    })
    const accountMenu = yield* new AccountMenu('accountMenu', {
      id: 'account',
    })

    return {
      model: { settingsDialog, accountMenu },

      update: {
        ClickedOpenSettings: model => ({
          model,
          messages: [
            model.settingsDialog.send(Dialog.Dialog.Message.RequestedOpen()),
          ],
        }),
      },

      view: (model, h) => ({
        title: 'Account',
        body: h.main(
          [],
          [
            model.accountMenu.view({
              items: ['Profile', 'Sign out'],
              buttonContent: h.span([], ['Account']),
              itemToConfig: item => ({ content: h.span([], [item]) }),
            }),
            h.button([h.OnClick(Message.ClickedOpenSettings())], ['Settings']),
            model.settingsDialog.view({
              toView: ({ dialog, panel, title, isVisible }) =>
                h.dialog(
                  [...dialog],
                  isVisible
                    ? [h.div([...panel], [h.h2([...title], ['Settings'])])]
                    : [],
                ),
            }),
          ],
        ),
      }),
    }
  }),
).pipe(
  // Each component's Layer carries its Commands, Mounts, and Subscriptions
  Layer.provide(Layer.mergeAll(Dialog.DialogLive, AccountMenu.Live)),
)

const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program)
