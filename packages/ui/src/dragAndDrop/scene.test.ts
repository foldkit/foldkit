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
  type DraggableMessage,
  update as dragAndDropUpdate,
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

const tableView = (model: Model, h: HtmlBuilder<Message>) =>
  h.table(
    [],
    [
      h.tbody(
        [],
        [
          h.tr(
            [],
            [
              h.td(
                [...droppable('monday', undefined, { role: 'Native' })],
                [
                  h.button(
                    [
                      ...draggable(
                        {
                          model: model.dragAndDrop,
                          toParentMessage,
                          itemId: 'card',
                          containerId: 'monday',
                          index: 0,
                          role: 'Native',
                        },
                        h,
                      ),
                    ],
                    ['Card'],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )

const container = (containerId: string) =>
  Scene.selector(`[data-droppable-id="${containerId}"]`)

const card = Scene.selector('[data-draggable-id="card"]')

describe('DragAndDrop view helpers', () => {
  it('gives a droppable the listbox role and its draggables the option role by default', () => {
    Scene.scene(
      { update, view: listView },
      Scene.given(initialModel),
      Scene.expect(container('list')).toHaveAttr('role', 'listbox'),
      Scene.expect(container('list')).toHaveAttr('aria-label', 'Tasks'),
      Scene.expect(card).toHaveAttr('role', 'option'),
      Scene.expect(card).toHaveAttr('aria-roledescription', 'draggable'),
    )
  })

  it('leaves the host role in place when droppable and draggable use the Native role', () => {
    Scene.scene(
      { update, view: tableView },
      Scene.given(initialModel),
      Scene.expect(container('monday')).not.toHaveAttr('role'),
      Scene.expect(card).not.toHaveAttr('role'),
      Scene.expect(card).toHaveAttr('aria-roledescription', 'draggable'),
      Scene.expect(card).toHaveAttr('tabIndex', '0'),
    )
  })
})
