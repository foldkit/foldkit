import { Effect } from 'effect'
import { Runtime } from 'foldkit'

import { createElement } from './embeddingCreateElement'

const container = document.getElementById('widget-slot')
if (container === null) {
  throw new Error('Missing widget container')
}

const element = createElement(container)

// embed starts the runtime and returns the handle. Flags seed the widget's
// starting Model. The handle is the whole boundary: the host never reads
// the Model or dispatches Messages.
const handle = Runtime.embed(element, {
  flags: Effect.succeed({ initialCount: 10 }),
})

// Host to widget. The value is validated against the Port's Schema; an
// invalid value never reaches the app and comes back as a typed Exit failure.
handle.ports.stepChanged.send(5)

// Widget to host. subscribe returns an unsubscribe function; multiple
// listeners each receive every emitted value.
const unsubscribe = handle.ports.countChanged.subscribe(count => {
  console.log(`widget count: ${count}`)
})

// On host unmount: dispose interrupts the runtime and runs all cleanup.
// Streams, Mounts, and in-flight Commands stop, every Block instance is
// released, the rendered DOM is removed, and the container element is
// restored empty, ready for a fresh embed. dispose is idempotent.
unsubscribe()
handle.dispose()
