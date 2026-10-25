import { Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Attribute, ChildAttribute } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { DragAndDropBlock, type RenderInfo } from './block.js'

const DragAndDropSceneDefinition = Block.makeDefinition('DragAndDropScene', {
  Model: DragAndDropBlock.Model,
  Message: Schema.Never,
})

const foldDragAndDropOutMessage = DragAndDropSceneDefinition.makeOutMessageFold(
  DragAndDropBlock,
  {
    StartedKeyboardDrag: () => model => ({ model }),
    ChangedKeyboardTarget: () => model => ({ model }),
    Reordered: () => model => ({ model }),
    Cancelled: () => model => ({ model }),
  },
)

const DragAndDropBinding = DragAndDropSceneDefinition.makeBinding(
  DragAndDropBlock,
  {
    read: model => Option.some(model),
    write: (_model, nextDragAndDrop) => nextDragAndDrop,
  },
).withOutMessagePolicy({ fold: foldDragAndDropOutMessage })

const DragAndDropSceneComposition = DragAndDropSceneDefinition.makeComposition({
  bindings: [DragAndDropBinding],
})

const update = DragAndDropSceneComposition.makeUpdate({})

const view = DragAndDropSceneComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        DragAndDropBinding.embedView({
          slotId: 'drag-and-drop',
          model,
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
      h.p([h.Id('drag-state')], [model.dragState._tag]),
    ],
  ),
)

const initialModel = DragAndDropBlock.init({ id: 'board' }).model
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

  it('routes consumer-placed handlers through the embedded Block boundary', () => {
    Scene.scene(
      { update, view },
      Scene.given(initialModel),
      Scene.expect(card).toHaveAttr('data-draggable-id', 'card-1'),
      Scene.expect(card).toHaveHandler('pointerdown'),
      Scene.pointerDown(card, { screenX: 40, screenY: 60 }),
      Scene.expect(Scene.selector('#drag-state')).toHaveText('Pending'),
    )
  })
})
