import { Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import { describe, it } from '@effect/vitest'

import {
  Message as DragAndDropMessage,
  type Model as DragAndDropModel,
  OutMessage as DragAndDropOutMessage,
  type DragInstructionsText,
  type DraggableMessage,
  update as dragAndDropUpdate,
  dragInstructions,
  draggable,
  droppable,
  init,
} from './index.js'

const Message = defineMessageUnion({
  GotDragAndDropMessage: { message: DragAndDropMessage },
})
type Message = typeof Message.Type

type Model = Readonly<{ dragAndDrop: DragAndDropModel }>

const initialModel: Model = { dragAndDrop: init({ id: 'board' }) }

const foldDragAndDropOutMessage = DragAndDropOutMessage.match<
  Update.Step<Model, Message>
>({
  Reordered: () => model => ({ model }),
  Cancelled: () => model => ({ model }),
})

const foldDragAndDrop = Update.foldChild({
  update: dragAndDropUpdate,
  read: (model: Model) => Option.some(model.dragAndDrop),
  write: (model, nextDragAndDrop) =>
    modifyFields(model, { dragAndDrop: () => nextDragAndDrop }),
  toParentMessage: message => Message.GotDragAndDropMessage({ message }),
  foldOutMessage: foldDragAndDropOutMessage,
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotDragAndDropMessage: ({ message }) => foldDragAndDrop(model, message),
  })

const toParentMessage = (message: DraggableMessage) =>
  Message.GotDragAndDropMessage({ message })

const listView = (model: Model, h: HtmlBuilder<Message>) =>
  h.ul(
    [...droppable('list', 'Tasks')],
    [
      h.li(
        [
          ...draggable(
            {
              model: model.dragAndDrop,
              toParentMessage,
              itemId: 'card',
              containerId: 'list',
              index: 0,
            },
            h,
          ),
        ],
        ['Card'],
      ),
    ],
  )

const instructedListView =
  (text?: DragInstructionsText) => (model: Model, h: HtmlBuilder<Message>) =>
    h.div(
      [],
      [
        dragInstructions(model.dragAndDrop, text),
        h.ul(
          [...droppable('list')],
          [
            h.li(
              [
                ...draggable(
                  {
                    model: model.dragAndDrop,
                    toParentMessage,
                    itemId: 'card',
                    containerId: 'list',
                    index: 0,
                    hasDragInstructions: true,
                  },
                  h,
                ),
              ],
              ['Card'],
            ),
          ],
        ),
      ],
    )

const instructions = Scene.selector('#board-drag-instructions')

const card = Scene.selector('[data-draggable-id="card"]')

describe('DragAndDrop view helpers', () => {
  it('leaves aria-describedby off a draggable without hasDragInstructions', () => {
    Scene.scene(
      { update, view: listView },
      Scene.given(initialModel),
      Scene.expect(card).not.toHaveAttr('aria-describedby'),
    )
  })

  it('points draggables at the drag instructions and switches the text during a keyboard drag', () => {
    Scene.scene(
      { update, view: instructedListView() },
      Scene.given(initialModel),
      Scene.expect(card).toHaveAttr(
        'aria-describedby',
        'board-drag-instructions',
      ),
      Scene.expect(instructions).toHaveAttr('hidden'),
      Scene.expect(card).toHaveAccessibleDescription(
        'Press Space or Enter to start dragging.',
      ),
      Scene.keydown(card, ' '),
      Scene.expect(card).toHaveAccessibleDescription(
        'Dragging. Press the arrow keys to move within the current container, Tab or Shift+Tab to move to the next or previous container, Space or Enter to drop, or Escape to cancel.',
      ),
    )
  })

  it('renders replacement drag instructions text', () => {
    Scene.scene(
      {
        update,
        view: instructedListView({
          idle: 'Pulsa Espacio o Intro para empezar a arrastrar.',
          keyboardDragging: 'Arrastrando.',
        }),
      },
      Scene.given(initialModel),
      Scene.expect(card).toHaveAccessibleDescription(
        'Pulsa Espacio o Intro para empezar a arrastrar.',
      ),
      Scene.keydown(card, 'Enter'),
      Scene.expect(card).toHaveAccessibleDescription('Arrastrando.'),
    )
  })
})
