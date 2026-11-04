import {
  ApplicationBlock,
  CatalogQueryBlock,
  FruitListboxBlock,
} from './contracts.js'

const { makeBinding, makeComposition, makeFieldsStep, makeOutMessageFold } =
  ApplicationBlock
export const CatalogBinding = makeBinding(CatalogQueryBlock, {
  field: 'catalog',
  init: { contextToArgs: () => [] },
})
export const FruitListboxBinding = makeBinding(FruitListboxBlock, {
  field: 'fruitListbox',
  init: { contextToArgs: () => [{ id: 'fruit-listbox' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(FruitListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ selectedFruit: () => value })),
  }),
})
export const ApplicationComposition = makeComposition({
  bindings: [CatalogBinding, FruitListboxBinding],
})
