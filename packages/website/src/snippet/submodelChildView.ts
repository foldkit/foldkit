// page/settings.ts
import { Submodel } from 'foldkit'

import {
  ChangedFontSize,
  ChangedTheme,
  type Message,
  ToggledNotifications,
} from './message'
import type { Model } from './model'

// The Submodel exports a view defined with Submodel.defineView<Model, Message>.
// The view takes the child's Model and the child's typed builder `h`, which
// the runtime supplies, and produces Html. The <Model, Message> type arguments
// brand the view with its Message type so the parent can lift each emitted
// Message into its wrapper Message when it embeds the Submodel, and they type
// `h`: its handlers accept exactly the Messages this Submodel dispatches.
export const view = Submodel.defineView<Model, Message>((model, h) =>
  h.div(
    [h.Class('flex flex-col gap-4')],
    [
      h.h2([h.Class('text-xl font-bold')], ['Settings']),
      h.div(
        [h.Class('flex gap-2')],
        [
          h.button([h.OnClick(ChangedTheme({ theme: 'Light' }))], ['Light']),
          h.button([h.OnClick(ChangedTheme({ theme: 'Dark' }))], ['Dark']),
          h.button([h.OnClick(ChangedTheme({ theme: 'System' }))], ['System']),
        ],
      ),
      h.div(
        [h.Class('flex gap-2')],
        [
          h.button(
            [h.OnClick(ChangedFontSize({ fontSize: 'Small' }))],
            ['Small'],
          ),
          h.button(
            [h.OnClick(ChangedFontSize({ fontSize: 'Medium' }))],
            ['Medium'],
          ),
          h.button(
            [h.OnClick(ChangedFontSize({ fontSize: 'Large' }))],
            ['Large'],
          ),
        ],
      ),
      h.button(
        [h.OnClick(ToggledNotifications())],
        [
          model.notificationsEnabled
            ? 'Disable notifications'
            : 'Enable notifications',
        ],
      ),
    ],
  ),
)
