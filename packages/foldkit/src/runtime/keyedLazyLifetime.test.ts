import { Array, Option, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import type { BoundaryRegistry } from '../html/boundary.js'
import { type HtmlBuilder, createKeyedLazy } from '../html/index.js'
import { requireBoundary } from '../html/runtimeSingleton.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import { makeElement } from './makeElement.js'
import { embed } from './start.js'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedCrash: {} })
type Message = typeof Message.Type

const rowView = (h: HtmlBuilder<Message>) =>
  h.div([h.Id('cached-row')], ['row'])

describe('render-scoped cache lifetime', () => {
  it.each(['Dispose', 'Crash'])(
    'releases entries while an embed handle is retained (%s)',
    async operation => {
      const registries = new Set<BoundaryRegistry>()
      const lazyRow = createKeyedLazy({ evict: 'AbsentFromRender' })
      const container = document.createElement('div')
      container.id = 'keyed-cache-lifetime'
      document.body.append(container)
      const handle = embed(
        makeElement({
          Model,
          init: () => ({ model: { count: 0 } }),
          update: (model: Model, message: Message) =>
            Message.match<Update.Return<Model, Message>>(message, {
              ClickedCrash: () => ({
                model: modifyFields(model, { count: count => count + 1 }),
              }),
            }),
          view: (model, h) => {
            registries.add(requireBoundary().registry)

            if (model.count > 0) {
              throw new Error('View construction failed')
            }

            return h.main(
              [],
              [
                lazyRow('row', rowView, [h]),
                h.button([h.OnClick(Message.ClickedCrash())], ['Crash']),
              ],
            )
          },
          container,
          crash: {
            view: (_context, h) => h.div([h.Id('crashed')], ['Crashed']),
          },
        }),
      )

      try {
        await vi.waitFor(() =>
          expect(document.getElementById('cached-row')).not.toBeNull(),
        )
        const registry = Option.getOrThrow(
          Array.head(Array.fromIterable(registries)),
        )
        expect(registry.keyedLazyStates.size).toBe(1)

        if (operation === 'Dispose') {
          handle.dispose()
        } else {
          document.querySelector('button')?.click()
          await vi.waitFor(() =>
            expect(document.getElementById('crashed')).not.toBeNull(),
          )
        }

        await vi.waitFor(() => expect(registry.keyedLazyStates.size).toBe(0))
        expect(document.getElementById('cached-row')).toBeNull()
      } finally {
        handle.dispose()
        document.body.replaceChildren()
      }
    },
  )
})
