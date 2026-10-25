import {
  Composition,
  OutMessage,
  model,
  update,
} from './compiler-diagnostics.fixture.js'

Composition.prepareBlock({ init: () => ({ count: 0 }), update })
Composition.prepareBlock({
  init: () => ({ model, outMessage: OutMessage.Changed() }),
  update,
})
