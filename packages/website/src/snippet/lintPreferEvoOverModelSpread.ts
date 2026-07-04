import { evo } from 'foldkit/struct'

// ❌ Bad
// Spreading the Model to update it drops the strict-keys guarantee evo gives.
const badUpdate = (model: Model) => ({
  ...model,
  count: model.count + 1,
})

// ✅ Good
const goodUpdate = (model: Model) => evo(model, { count: count => count + 1 })
