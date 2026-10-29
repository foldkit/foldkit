import { Binding, Composition } from './compiler-diagnostics.fixture.js'

Composition.makeUpdate({
  Clicked: model =>
    model.child.count > 0 ? Binding.requestIncrement()(model) : { model },
  CompletedSave: model => ({ model }),
})
