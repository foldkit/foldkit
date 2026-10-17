import { Duration, Effect, Schema } from 'effect'
import { Form } from 'foldkit/experimental'
import { Rule, makeRules } from 'foldkit/fieldValidation'

const EMAIL_CHECK_DELAY_MS = 150

export const emailField = Form.field({
  schema: Schema.String,
  initial: { value: '' },
  validateOn: 'Blur',
  validate: value =>
    Effect.gen(function* () {
      yield* Effect.sleep(Duration.millis(EMAIL_CHECK_DELAY_MS))
      return value === 'blocked@example.com'
        ? ['This email cannot be used']
        : []
    }),
  rules: makeRules({
    required: 'Enter an email address',
    rules: [Rule.email('Enter a valid email address')],
  }),
})
