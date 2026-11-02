import { String } from 'effect'

import { makeStep } from './definition'
import { OutMessage } from './outMessage'

export const submitMessage = makeStep(model => {
  const text = String.trim(model.text)

  if (String.isEmpty(text)) {
    return { model }
  }

  return { model, outMessage: OutMessage.Submitted({ text }) }
})
