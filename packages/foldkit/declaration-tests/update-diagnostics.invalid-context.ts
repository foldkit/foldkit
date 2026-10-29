import { Binding, Composition } from './compiler-diagnostics.fixture.js'

Composition.makeUpdate.withContext((isEnabled: boolean) => ({
  Clicked: model => (isEnabled ? Binding.requestIncrement()(model) : { model }),
  CompletedSave: model => ({ model }),
}))
