import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import * as Child from './child'

{
  // ❌ Bad: Got is reserved for Submodel wrappers.
  const GotWeather = m('GotWeather', {
    temperature: S.Number,
  })
}

{
  // ✅ Good: use a name that does not start with Got for Command results.
  const ReceivedWeather = m('ReceivedWeather', {
    temperature: S.Number,
  })
}

{
  // ❌ Bad: Got-prefixed wrappers must carry child Messages.
  const GotChildMessage = m('GotChildMessage', {
    id: S.String,
  })
}

{
  // ✅ Good: Got wraps a child Message.
  const GotChildMessage = m('GotChildMessage', {
    id: S.String,
    message: Child.Message,
  })
}
