import { Duration, Effect, Schema } from 'effect'
import { Form } from 'foldkit/experimental'
import { Rule, makeRules } from 'foldkit/fieldValidation'

const EMAIL_CHECK_DELAY_MS = 150
const BLOCKED_EMAIL = 'blocked@example.com'

export const sharedFields = Form.defineFields({
  email: Form.field({
    schema: Schema.String,
    initial: '',
    validateOn: 'Blur',
    rules: makeRules({
      required: 'Enter an email address',
      rules: [Rule.email('Enter a valid email address')],
    }),
    validate: value =>
      Effect.gen(function* () {
        yield* Effect.sleep(Duration.millis(EMAIL_CHECK_DELAY_MS))
        return value === BLOCKED_EMAIL ? ['This email cannot be used'] : []
      }),
  }),
})
