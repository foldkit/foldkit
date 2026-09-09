import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import * as Child from './child'

{
  // ❌ Bad: Got is reserved for Submodel wrappers.
  const Message = defineMessageUnion({
    GotWeather: { temperature: Schema.Number },
  })
}

{
  // ✅ Good: use a name that does not start with Got for Command results.
  const Message = defineMessageUnion({
    ReceivedWeather: { temperature: Schema.Number },
  })
}

{
  // ❌ Bad: Got-prefixed wrappers must carry child Messages.
  const Message = defineMessageUnion({
    GotChildMessage: { id: Schema.String },
  })
}

{
  // ✅ Good: Got wraps a child Message.
  const Message = defineMessageUnion({
    GotChildMessage: {
      id: Schema.String,
      message: Child.Message,
    },
  })
}
