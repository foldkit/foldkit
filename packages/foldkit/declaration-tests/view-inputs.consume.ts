import { DateTime, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'

import {
  ChildBinding,
  DateInputBlock,
  SchemaBackedItem,
  ViewInputsModel,
  makeGenericBlock,
  view,
} from './view-inputs.accepted.js'

export const emittedView = view

export const emittedConfig = ChildBinding.embedView({
  slotId: 'emitted-child',
  model: ViewInputsModel.make({ id: 'emitted-child' }),
  viewInputs: {
    toView: value => value,
    content: null,
    attributes: [],
    maybeLabel: Option.none(),
    item: SchemaBackedItem.make({ id: 'emitted-item' }),
    recursive: { id: 'root', children: [] },
  },
})

const GenericParentModel = Schema.Struct({ child: ViewInputsModel })
const EmittedGenericViewInputsParentDefinition = Block.makeDefinition(
  'EmittedGenericViewInputsParent',
  {
    Model: GenericParentModel,
    Message: Schema.Never,
  },
)
const GenericStringBinding =
  EmittedGenericViewInputsParentDefinition.makeBinding(
    makeGenericBlock<string>(),
    { field: 'child' },
  )

export const emittedGenericConfig = GenericStringBinding.embedView({
  slotId: 'emitted-generic-child',
  model: ViewInputsModel.make({ id: 'emitted-generic-child' }),
  viewInputs: {
    items: ['first'],
    itemToView: () => null,
  },
})

const DateBinding = EmittedGenericViewInputsParentDefinition.makeBinding(
  DateInputBlock,
  { field: 'child' },
)
const date = new Date('2026-10-21T12:00:00.000Z')
const utc = DateTime.makeUnsafe('2026-10-21T12:00:00.000Z')
const timeZone = DateTime.zoneMakeNamedUnsafe('America/New_York')
const zoned = DateTime.makeZonedUnsafe(utc, { timeZone })

export const emittedDateConfig = DateBinding.embedView({
  slotId: 'date-child',
  model: ViewInputsModel.make({ id: 'date-child' }),
  viewInputs: {
    report: {
      createdAt: date,
      timeline: [{ at: date }],
      maybeExpiresAt: Option.some(date),
      range: [date, date],
      byId: { first: { at: date } },
      utc,
      zoned,
      timeZone,
      namedTimeZone: timeZone,
      effectTimeline: [{ at: utc }],
      maybeEffectDeadline: Option.some(zoned),
    },
  },
})
