import { type Html, type HtmlBuilder } from 'foldkit/html'

import { Shared } from '../../component'

export const content = <Message>(
  email: string,
  toMessage: (value: string) => Message,
  h: HtmlBuilder<Message>,
): Html => Shared.emailSignupContent(email, toMessage, h)
