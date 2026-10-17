// page/settings/view.ts
import { SettingsComposition } from './definition'
import { Message } from './message'

export const view = SettingsComposition.makeView((model, h) =>
  h.div(
    [h.Class('flex flex-col gap-4')],
    [
      h.h2([h.Class('text-xl font-bold')], ['Settings']),
      h.div(
        [h.Class('flex gap-2')],
        [
          h.button(
            [h.OnClick(Message.ChangedTheme({ theme: 'Light' }))],
            ['Light'],
          ),
          h.button(
            [h.OnClick(Message.ChangedTheme({ theme: 'Dark' }))],
            ['Dark'],
          ),
          h.button(
            [h.OnClick(Message.ChangedTheme({ theme: 'System' }))],
            ['System'],
          ),
        ],
      ),
      h.div(
        [h.Class('flex gap-2')],
        [
          h.button(
            [h.OnClick(Message.ChangedFontSize({ fontSize: 'Small' }))],
            ['Small'],
          ),
          h.button(
            [h.OnClick(Message.ChangedFontSize({ fontSize: 'Medium' }))],
            ['Medium'],
          ),
          h.button(
            [h.OnClick(Message.ChangedFontSize({ fontSize: 'Large' }))],
            ['Large'],
          ),
        ],
      ),
      h.button(
        [h.OnClick(Message.ToggledNotifications())],
        [
          model.notificationsEnabled
            ? 'Disable notifications'
            : 'Enable notifications',
        ],
      ),
    ],
  ),
)
