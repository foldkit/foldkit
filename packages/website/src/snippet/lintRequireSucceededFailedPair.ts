import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

// ❌ Bad
// A Succeeded* result implies failure is meaningful, but there is no Failed twin.
const SucceededSaveDraft = m('SucceededSaveDraft', { id: S.String })

// ✅ Good
const SucceededFetchWeather = m('SucceededFetchWeather', {
  temperature: S.Number,
})
const FailedFetchWeather = m('FailedFetchWeather', { error: S.String })
