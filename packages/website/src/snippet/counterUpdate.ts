import { modifyFields } from 'foldkit/struct'

const update = ApplicationComposition.makeUpdate({
  ClickedDecrement: model => ({
    model: modifyFields(model, { count: count => count - 1 }),
  }),
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
  ClickedReset: model => ({ model: modifyFields(model, { count: () => 0 }) }),
})
