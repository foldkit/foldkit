import { Runtime } from 'foldkit'

// ❌ Bad
// Turning off freezeModel silences the dev warning instead of fixing the
// mutation it caught.
const badApp = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  freezeModel: false,
})

// ✅ Good
// Leave the guardrail on and fix the in-place mutation it flags.
const goodApp = Runtime.makeApplication({ Model, init, update, view })
