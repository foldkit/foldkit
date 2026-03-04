import { Effect, Match as M } from 'effect'
import { Ui } from 'foldkit'
import { Command } from 'foldkit/command'
import { evo } from 'foldkit/struct'

import {
  GotDialogDemoMessage,
  GotDisclosureDemoMessage,
  GotHorizontalTabsDemoMessage,
  GotListboxDemoMessage,
  GotListboxGroupedDemoMessage,
  GotListboxMultiDemoMessage,
  GotMenuAnimatedDemoMessage,
  GotMenuBasicDemoMessage,
  GotPopoverAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  GotSwitchDemoMessage,
  GotVerticalTabsDemoMessage,
  type Message,
} from './message'
import type { Model } from './model'

export type UpdateReturn = [Model, ReadonlyArray<Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (
  model: Model,
  message: Message,
): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      GotDialogDemoMessage: ({ message }) => {
        const [nextDialogDemo, dialogCommands] = Ui.Dialog.update(
          model.dialogDemo,
          message,
        )

        return [
          evo(model, {
            dialogDemo: () => nextDialogDemo,
          }),
          dialogCommands.map(
            Effect.map(message => GotDialogDemoMessage({ message })),
          ),
        ]
      },

      GotDisclosureDemoMessage: ({ message }) => {
        const [nextDisclosureDemo, disclosureCommands] =
          Ui.Disclosure.update(model.disclosureDemo, message)

        return [
          evo(model, {
            disclosureDemo: () => nextDisclosureDemo,
          }),
          disclosureCommands.map(
            Effect.map(message =>
              GotDisclosureDemoMessage({ message }),
            ),
          ),
        ]
      },

      GotListboxDemoMessage: ({ message }) => {
        const [nextListboxDemo, listboxCommands] = Ui.Listbox.update(
          model.listboxDemo,
          message,
        )

        return [
          evo(model, {
            listboxDemo: () => nextListboxDemo,
          }),
          listboxCommands.map(
            Effect.map(message => GotListboxDemoMessage({ message })),
          ),
        ]
      },

      GotListboxMultiDemoMessage: ({ message }) => {
        const [nextListboxMultiDemo, listboxMultiCommands] =
          Ui.Listbox.Multi.update(model.listboxMultiDemo, message)

        return [
          evo(model, {
            listboxMultiDemo: () => nextListboxMultiDemo,
          }),
          listboxMultiCommands.map(
            Effect.map(message =>
              GotListboxMultiDemoMessage({ message }),
            ),
          ),
        ]
      },

      GotListboxGroupedDemoMessage: ({ message }) => {
        const [nextListboxGroupedDemo, listboxGroupedCommands] =
          Ui.Listbox.update(model.listboxGroupedDemo, message)

        return [
          evo(model, {
            listboxGroupedDemo: () => nextListboxGroupedDemo,
          }),
          listboxGroupedCommands.map(
            Effect.map(message =>
              GotListboxGroupedDemoMessage({ message }),
            ),
          ),
        ]
      },

      GotMenuBasicDemoMessage: ({ message }) => {
        const [nextMenuBasicDemo, menuBasicCommands] = Ui.Menu.update(
          model.menuBasicDemo,
          message,
        )

        return [
          evo(model, {
            menuBasicDemo: () => nextMenuBasicDemo,
          }),
          menuBasicCommands.map(
            Effect.map(message =>
              GotMenuBasicDemoMessage({ message }),
            ),
          ),
        ]
      },

      GotMenuAnimatedDemoMessage: ({ message }) => {
        const [nextMenuAnimatedDemo, menuAnimatedCommands] =
          Ui.Menu.update(model.menuAnimatedDemo, message)

        return [
          evo(model, {
            menuAnimatedDemo: () => nextMenuAnimatedDemo,
          }),
          menuAnimatedCommands.map(
            Effect.map(message =>
              GotMenuAnimatedDemoMessage({ message }),
            ),
          ),
        ]
      },

      GotPopoverBasicDemoMessage: ({ message }) => {
        const [nextPopoverBasicDemo, popoverBasicCommands] =
          Ui.Popover.update(model.popoverBasicDemo, message)

        return [
          evo(model, {
            popoverBasicDemo: () => nextPopoverBasicDemo,
          }),
          popoverBasicCommands.map(
            Effect.map(message =>
              GotPopoverBasicDemoMessage({ message }),
            ),
          ),
        ]
      },

      GotPopoverAnimatedDemoMessage: ({ message }) => {
        const [nextPopoverAnimatedDemo, popoverAnimatedCommands] =
          Ui.Popover.update(model.popoverAnimatedDemo, message)

        return [
          evo(model, {
            popoverAnimatedDemo: () => nextPopoverAnimatedDemo,
          }),
          popoverAnimatedCommands.map(
            Effect.map(message =>
              GotPopoverAnimatedDemoMessage({ message }),
            ),
          ),
        ]
      },

      GotSwitchDemoMessage: ({ message }) => {
        const [nextSwitchDemo, switchCommands] = Ui.Switch.update(
          model.switchDemo,
          message,
        )

        return [
          evo(model, {
            switchDemo: () => nextSwitchDemo,
          }),
          switchCommands.map(
            Effect.map(message => GotSwitchDemoMessage({ message })),
          ),
        ]
      },

      GotHorizontalTabsDemoMessage: ({ message }) => {
        const [nextHorizontalTabsDemo, horizontalTabsCommands] =
          Ui.Tabs.update(model.horizontalTabsDemo, message)

        return [
          evo(model, {
            horizontalTabsDemo: () => nextHorizontalTabsDemo,
          }),
          horizontalTabsCommands.map(
            Effect.map(message =>
              GotHorizontalTabsDemoMessage({ message }),
            ),
          ),
        ]
      },

      GotVerticalTabsDemoMessage: ({ message }) => {
        const [nextVerticalTabsDemo, verticalTabsCommands] =
          Ui.Tabs.update(model.verticalTabsDemo, message)

        return [
          evo(model, {
            verticalTabsDemo: () => nextVerticalTabsDemo,
          }),
          verticalTabsCommands.map(
            Effect.map(message =>
              GotVerticalTabsDemoMessage({ message }),
            ),
          ),
        ]
      },
    }),
  )
