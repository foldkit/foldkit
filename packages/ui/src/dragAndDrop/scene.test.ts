import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Attribute, ChildAttribute } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { DragAndDrop, DragAndDropLive, type RenderInfo } from './block.js'

class DragAndDropScene extends Block<DragAndDropScene>()('DragAndDropScene', {
  Model: Schema.Struct({ dragAndDrop: DragAndDrop }),
}) {}

const DragAndDropSceneLive = DragAndDropScene.make(
  Effect.fn(function* () {
    const dragAndDrop = yield* new DragAndDrop('board', {})

    return {
      model: { dragAndDrop },
      view: (model, h) =>
        h.div(
          [],
          [
            model.dragAndDrop.view({
              toView: ({ draggable, droppable }) =>
                h.div(
                  [...droppable('todo', 'Todo')],
                  [
                    h.div(
                      [
                        h.Id('card'),
                        ...draggable({
                          itemId: 'card-1',
                          containerId: 'todo',
                          index: 0,
                        }),
                      ],
                      ['Card'],
                    ),
                  ],
                ),
            }),
            h.p([h.Id('drag-state')], [model.dragAndDrop.model.dragState._tag]),
          ],
        ),
    }
  }),
).pipe(Layer.provide(DragAndDropLive))

const card = Scene.selector('#card')

describe('DragAndDrop view', () => {
  it('publishes child attributes rather than raw local Message attributes', () => {
    expectTypeOf<ReturnType<RenderInfo['draggable']>>().toMatchTypeOf<
      ReadonlyArray<ChildAttribute>
    >()
    expectTypeOf<ReturnType<RenderInfo['draggable']>>().not.toMatchTypeOf<
      ReadonlyArray<Attribute<never>>
    >()
  })

  it.effect('routes consumer-placed handlers to the embedded instance', () =>
    Scene.scene(
      DragAndDropSceneLive,
      Scene.expect(card).toHaveAttr('data-draggable-id', 'card-1'),
      Scene.expect(card).toHaveHandler('pointerdown'),
      Scene.pointerDown(card, { screenX: 40, screenY: 60 }),
      Scene.expect(Scene.selector('#drag-state')).toHaveText('Pending'),
    ),
  )
})
