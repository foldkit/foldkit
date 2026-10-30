import { Command, click, role, within } from 'foldkit/scene'

import { Note, Save } from './notes'
import { FetchWeather, Message, type Weather } from './weather'

declare const weather: Weather

// Assert the pending Commands, then supply a result Message.
click(role('button', { name: 'Get Weather' }))
Command.expectExact(FetchWeather)
Command.resolve(FetchWeather, Message.SucceededFetchWeather({ weather }))

// Pass an instance instead of a Definition to check the arguments too.
Command.expectExact(FetchWeather({ zipCode: '90210' }))

// Resolve and assert a batch. Every listed resolver must match a pending
// Command, and no Command may remain unresolved.
Command.resolveAllExact([
  FetchWeather,
  Message.SucceededFetchWeather({ weather }),
])

// Subset and empty assertions.
Command.expectHas(FetchWeather)
Command.expectNone()

// A child instance's Command. Resolve it with the child's own result
// Message; Foldkit routes it back to the instance that returned the Command.
click(
  within(role('region', { name: 'note-1' }), role('button', { name: 'Save' })),
)
Command.resolve(Save, Note.Message.SucceededSave())

// Sibling instances with identical pending Commands. Select one by path.
Command.resolve(
  Command.at(['notes', 'note-2'], Save),
  Note.Message.FailedSave({ reason: 'Offline' }),
)
