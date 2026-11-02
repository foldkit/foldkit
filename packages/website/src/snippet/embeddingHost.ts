import { Runtime } from 'foldkit'

import { createElement } from './widget'

const container = document.getElementById('widget-slot')
if (container === null) {
  throw new Error('Missing widget container')
}

// Flags seed the widget's initial state at mount.
const element = createElement(container, { initialCount: 10 })

// embed starts the runtime and returns the handle. The handle is the whole
// boundary: the host never reads the Model or dispatches Messages.
const handle = Runtime.embed(element)

// Host to widget. The value is validated against the Port's Schema; an
// invalid value never reaches the app and comes back as a typed Exit failure.
handle.ports.stepChanged.send(5)

// Widget to host. subscribe returns an unsubscribe function; multiple
// listeners each receive every emitted value.
const unsubscribe = handle.ports.countChanged.subscribe(count => {
  console.log(`widget count: ${count}`)
})

// Await dispose before reusing this container for a different Program.
unsubscribe()
await handle.dispose()
