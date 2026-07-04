import { evo } from 'foldkit/struct'

// ❌ Bad
// Spreading a nested field inside evo defeats the point of evo.
const badUpdate = (model: Model) =>
  evo(model, {
    user: () => ({ ...model.user, name: 'Ada' }),
  })

// ✅ Good
// Evolve the nested field with a nested evo.
const goodUpdate = (model: Model) =>
  evo(model, {
    user: user => evo(user, { name: () => 'Ada' }),
  })
