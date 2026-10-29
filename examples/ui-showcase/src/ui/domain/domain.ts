import { Schema } from 'effect'

export const Plan = Schema.Literals(['Startup', 'Business', 'Enterprise'])
export type Plan = typeof Plan.Type

export const DemoTab = Schema.Literals(['Foldkit', 'React', 'Elm'])
export type DemoTab = typeof DemoTab.Type

export const City = Schema.Literals([
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Plymouth',
  'Quito',
  'Wellington',
  'Zurich',
])
export type City = typeof City.Type

export const ListboxItem = Schema.Literals([
  'Michael Bluth',
  'Lindsay Funke',
  'Gob Bluth',
  'George Michael',
  'Maeby Funke',
  'Buster Bluth',
  'Tobias Funke',
  'Lucille Bluth',
])
export type ListboxItem = typeof ListboxItem.Type

export const DemoCard = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
})
export type DemoCard = typeof DemoCard.Type

export const DemoColumn = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  cards: Schema.Array(DemoCard),
})
export type DemoColumn = typeof DemoColumn.Type
