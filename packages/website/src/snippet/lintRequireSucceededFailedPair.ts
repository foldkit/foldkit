import { m } from 'foldkit/message'

// ❌ Bad
// A Succeeded* result implies failure is meaningful, but there is no Failed twin.
const SucceededFetchWeather = m('SucceededFetchWeather', {
  temperature: S.Number,
})

// ✅ Good
const SucceededFetchWeatherFixed = m('SucceededFetchWeather', {
  temperature: S.Number,
})
const FailedFetchWeather = m('FailedFetchWeather', { error: S.String })
