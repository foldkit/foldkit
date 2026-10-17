// page/commandMenu.ts
import { Array, Option } from 'effect'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'

import { CommandMenuComposition } from './definition'
import { Message } from './message'
import { buttonId, itemId, menuId } from './model'

type SlotItem = Readonly<{
  id: string
  label: string
  isActive: boolean
  attributes: ReadonlyArray<ChildAttribute>
}>

type Slot = Readonly<{
  isOpen: boolean
  buttonAttributes: ReadonlyArray<ChildAttribute>
  menuAttributes: ReadonlyArray<ChildAttribute>
  items: ReadonlyArray<SlotItem>
}>

type ViewInputs = Readonly<{
  items: ReadonlyArray<string>
  toView: (slot: Slot) => Html
}>

export const view = CommandMenuComposition.makeView.withInputs<ViewInputs>(
  (model, viewInputs, h) => {
    const toggleMessage = model.isOpen
      ? Message.ClosedMenu()
      : Message.OpenedMenu()

    const toSlotItem = (label: string, index: number): SlotItem => {
      const id = itemId(model.id, label)
      const isActive = Option.contains(model.maybeActiveItemIndex, index)

      return {
        id,
        label,
        isActive,
        attributes: childAttributes([
          h.Id(id),
          h.Role('menuitem'),
          ...(isActive ? [h.DataAttribute('active', '')] : []),
          h.OnMouseEnter(Message.HoveredItem({ index })),
          h.OnClick(Message.SelectedItem({ index, label })),
        ]),
      }
    }

    return viewInputs.toView({
      isOpen: model.isOpen,
      buttonAttributes: childAttributes([
        h.Id(buttonId(model.id)),
        h.AriaHasPopup('menu'),
        h.AriaExpanded(model.isOpen),
        h.AriaControls(menuId(model.id)),
        h.OnClick(toggleMessage),
      ]),
      menuAttributes: childAttributes([h.Id(menuId(model.id)), h.Role('menu')]),
      items: Array.map(viewInputs.items, toSlotItem),
    })
  },
)
