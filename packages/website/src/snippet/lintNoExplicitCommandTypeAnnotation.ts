import { Command } from 'foldkit'

// ❌ Bad
// The Command type is already carried by Command.define; annotating it is noise.
const SaveDraft: Command.Command<Message> = Command.define(
  'SaveDraft',
  SucceededSaveDraft,
)(saveDraftEffect)

// ✅ Good
const FetchWeather = Command.define(
  'FetchWeather',
  SucceededFetchWeather,
)(fetchWeatherEffect)
