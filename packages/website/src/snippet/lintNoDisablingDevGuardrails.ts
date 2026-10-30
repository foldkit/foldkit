import { Effect, Schema } from 'effect'
import { Block, Program } from 'foldkit'

class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ count: Schema.Number }),
}) {}

const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },
      view: (model, h) => ({
        title: 'Counter',
        body: h.p([], [`${model.count}`]),
      }),
    }
  }),
)

// ❌ Bad
// Turning off slow silences the warning instead of fixing the slow phase.
const badProgram = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  slow: false,
})

// ✅ Good
// Keep the guardrail and tune its thresholds when a phase is expected to be slow.
const goodProgram = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  slow: { thresholdOverrides: { View: 32 } },
})
