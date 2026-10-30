import { Array, Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { DragAndDrop } from '@foldkit/ui'

const Item = Schema.Struct({ id: Schema.String, label: Schema.String })
type Item = typeof Item.Type

declare const reorder: (
  items: ReadonlyArray<Item>,
  itemId: string,
  fromIndex: number,
  toIndex: number,
) => ReadonlyArray<Item>

export class SortableList extends Block<SortableList>()('SortableList', {
  Model: Schema.Struct({
    dragAndDrop: DragAndDrop.DragAndDrop,
    items: Schema.Array(Item),
  }),
}) {}

export const SortableListLive = SortableList.make(
  Effect.fn(function* () {
    const dragAndDrop = yield* new DragAndDrop.DragAndDrop('dragAndDrop', {
      id: 'sortable-list',
    })

    return {
      model: {
        dragAndDrop,
        items: [
          { id: '1', label: 'First' },
          { id: '2', label: 'Second' },
          { id: '3', label: 'Third' },
        ],
      },

      update: {
        // `Reordered` carries the move so you can apply it to your own list
        ...dragAndDrop.on({
          Reordered: (model, { itemId, fromIndex, toIndex }) => ({
            model: modifyFields(model, {
              items: items => reorder(items, itemId, fromIndex, toIndex),
            }),
          }),
        }),
      },

      // Lay out the draggable and droppable attribute bundles in `toView`
      view: (model, h) =>
        model.dragAndDrop.view({
          toView: ({ draggable, droppable }) =>
            h.ul(
              [
                ...droppable('list', 'Sortable items'),
                h.Class('flex flex-col gap-2'),
              ],
              Array.map(model.items, (item, index) =>
                h.li(
                  [
                    ...draggable({
                      itemId: item.id,
                      containerId: 'list',
                      index,
                    }),
                    h.Class('p-3 rounded-lg border cursor-grab'),
                  ],
                  [h.span([], [item.label])],
                ),
              ),
            ),
        }),
    }
  }),
).pipe(Layer.provide(DragAndDrop.DragAndDropLive))
