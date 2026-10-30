import { Effect, Schema } from 'effect'
import { Block, Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedClose: {},
  CompletedPortalToBody: {},
})

const PortalToBody = Mount.define('PortalToBody', {
  messages: [Message.CompletedPortalToBody],
})

export class Overlay extends Block<Overlay>()('Overlay', {
  Model: Schema.Struct({ isOpen: Schema.Boolean }),
  Message,
  Mount: [PortalToBody],
  OutMessage: defineMessageUnion({ Closed: {} }),
}) {}

export const OverlayLive = Overlay.make(
  Effect.fn(function* () {
    return {
      model: { isOpen: true },

      update: {
        ClickedClose: model => ({
          model,
          outMessage: Overlay.OutMessage.Closed(),
        }),
        CompletedPortalToBody: model => ({ model }),
      },

      mounts: {
        PortalToBody: ({ element }) =>
          Effect.acquireRelease(
            Effect.sync(() => document.body.appendChild(element)),
            () => Effect.sync(() => element.remove()),
          ).pipe(Effect.as(Message.CompletedPortalToBody())),
      },

      view: (_model, h) =>
        h.div(
          [h.Class('fixed inset-0 bg-black/50'), h.OnMount(PortalToBody())],
          [h.button([h.OnClick(Message.ClickedClose())], ['Close'])],
        ),
    }
  }),
)
