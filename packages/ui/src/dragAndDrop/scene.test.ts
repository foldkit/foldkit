import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute, TaggedAttribute } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { DragAndDropBlock, type RenderInfo, layer } from './block.js'

const DragAndDropSceneKey = Symbol('DragAndDropScene')
const DragAndDropSceneBlock = Block.make('DragAndDropScene', {
  key: DragAndDropSceneKey,
  InitArgs: Block.makeInputContract<readonly []>(),
  Model: Schema.Struct({ dragAndDrop: DragAndDropBlock.Model }),
  Message: Schema.Never,
  view: { kind: 'Element' },
})

const foldDragAndDropOutMessage = DragAndDropSceneBlock.makeOutMessageFold(
  DragAndDropBlock,
  {
    StartedKeyboardDrag: () => model => ({ model }),
    ChangedKeyboardTarget: () => model => ({ model }),
    Reordered: () => model => ({ model }),
    Cancelled: () => model => ({ model }),
  },
)

const DragAndDropBinding = DragAndDropSceneBlock.makeRequiredFieldBinding(
  DragAndDropBlock,
  {
    field: 'dragAndDrop',
    init: { contextToArgs: () => [{ id: 'board' }] },
  },
).withOutMessagePolicy({ fold: foldDragAndDropOutMessage })

const DragAndDropSceneComposition = DragAndDropSceneBlock.makeComposition({
  bindings: [DragAndDropBinding],
})

const init = DragAndDropSceneComposition.makeInit(() => ({ model: {} }))
const update = DragAndDropSceneComposition.makeUpdate({})

const view = DragAndDropSceneComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        DragAndDropBinding.embedView({
          slotId: 'drag-and-drop',
          model: model.dragAndDrop,
          viewInputs: {
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
          },
        }),
      ),
      h.p([h.Id('drag-state')], [model.dragAndDrop.dragState._tag]),
    ],
  ),
)

const card = Scene.selector('#card')

const dragAndDropScene = {
  block: DragAndDropSceneBlock,
  layer: DragAndDropSceneBlock.makeLayer(
    Effect.gen(function* () {
      const children = yield* DragAndDropSceneComposition.acquireChildren()

      return {
        children,
        init,
        update,
        view: view,
      }
    }),
  ).pipe(Layer.provide(layer)),
}

describe('DragAndDrop view', () => {
  it('publishes child attributes rather than raw local Message attributes', () => {
    expectTypeOf<ReturnType<RenderInfo['draggable']>>().toMatchTypeOf<
      ReadonlyArray<ChildAttribute>
    >()
    expectTypeOf<ReturnType<RenderInfo['draggable']>>().not.toMatchTypeOf<
      ReadonlyArray<TaggedAttribute<never>>
    >()
  })

  it.effect(
    'routes consumer-placed handlers through the embedded Block boundary',
    () =>
      Scene.scene(
        dragAndDropScene,
        Scene.init(),
        Scene.expect(card).toHaveAttr('data-draggable-id', 'card-1'),
        Scene.expect(card).toHaveHandler('pointerdown'),
        Scene.pointerDown(card, { screenX: 40, screenY: 60 }),
        Scene.expect(Scene.selector('#drag-state')).toHaveText('Pending'),
      ),
  )
})
