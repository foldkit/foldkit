import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Popover, PopoverLive } from './block.js'

const popoverId = 'badge-popover'
const portalRootId = 'foldkit-portal-root'

class PopoverSiblingRuntimeTest extends Block<PopoverSiblingRuntimeTest>()(
  'PopoverSiblingRuntimeTest',
  {
    Model: Schema.Struct({ popover: Popover, isBadgeShown: Schema.Boolean }),
    Message: defineMessageUnion({ ClickedToggleBadge: {} }),
  },
) {}

const PopoverSiblingRuntimeTestLive = PopoverSiblingRuntimeTest.make(
  Effect.fn(function* () {
    const popover = yield* new Popover('popover', { id: popoverId })

    return {
      model: { popover, isBadgeShown: false },
      update: {
        ClickedToggleBadge: model => ({
          model: modifyFields(model, { isBadgeShown: isShown => !isShown }),
        }),
      },
      view: (model, h) =>
        h.main(
          [],
          [
            h.button(
              [
                h.Id('toggle-badge'),
                h.OnClick(
                  PopoverSiblingRuntimeTest.Message.ClickedToggleBadge(),
                ),
              ],
              ['Toggle badge'],
            ),
            model.popover.view({
              anchor: { placement: 'bottom-start' },
              toView: ({ button, panel, isVisible }) =>
                h.div(
                  [h.Id('wrapper')],
                  [
                    h.button([...button], ['Open']),
                    ...(model.isBadgeShown
                      ? [h.span([h.Id('badge')], ['!'])]
                      : []),
                    ...(isVisible
                      ? [h.div([...panel], ['Panel content'])]
                      : []),
                  ],
                ),
            }),
          ],
        ),
    }
  }),
).pipe(Layer.provide(PopoverLive))

describe('Popover with a portaled panel', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('renders a sibling that appears before the open panel', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    container.id = 'badge-popover-app'
    document.body.append(container)
    const handle = Runtime.embed(
      Program.makeElement(PopoverSiblingRuntimeTest, {
        layer: PopoverSiblingRuntimeTestLive,
        container,
      }),
    )

    try {
      await vi.waitFor(() => {
        expect(document.getElementById(`${popoverId}-button`)).not.toBeNull()
      })
      document.getElementById(`${popoverId}-button`)?.click()

      await vi.waitFor(() => {
        expect(
          document.getElementById(`${popoverId}-panel`)?.parentElement?.id,
        ).toBe(portalRootId)
      })
      document.getElementById('toggle-badge')?.click()

      await vi.waitFor(() => {
        expect(document.getElementById('badge')?.parentElement?.id).toBe(
          'wrapper',
        )
      })
      expect(
        document.getElementById(`${popoverId}-panel`)?.parentElement?.id,
      ).toBe(portalRootId)
      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      handle.dispose()
    }
  })
})
