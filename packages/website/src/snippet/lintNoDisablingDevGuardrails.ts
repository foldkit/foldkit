import { Application } from 'foldkit'

// ❌ Bad
// Turning off freezeModel silences the dev warning instead of fixing the
// mutation it caught.
const badApp = Application.make({
  Model,
  init,
  update,
  view,
  freezeModel: false,
})

// ✅ Good
// Leave the guardrail on and fix the in-place mutation it flags.
const goodApp = Application.make({ Model, init, update, view })
