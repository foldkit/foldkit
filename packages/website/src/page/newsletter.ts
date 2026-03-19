import type { Html } from 'foldkit/html'

import { div } from '../html'
import type {
  EmailSubscriptionStatus,
  StringField,
  TableOfContentsEntry,
} from '../main'
import { pageTitle } from '../prose'
import { emailSignupContentView } from '../view/shared'

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = []

export const view = (
  emailField: StringField,
  emailSubscriptionStatus: EmailSubscriptionStatus,
): Html =>
  div(
    [],
    [
      pageTitle('newsletter', 'Newsletter'),
      emailSignupContentView(emailField, emailSubscriptionStatus),
    ],
  )
