import { ApplicationComposition } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

// ❌ Bad
// Turning off freezeModel silences the dev warning instead of fixing the
// mutation it caught.
const badApplication = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  container: document.getElementById('root'),
  freezeModel: false,
})

// ✅ Good
// Leave the guardrail on and fix the in-place mutation it flags.
const goodApplication = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  container: document.getElementById('root'),
})
