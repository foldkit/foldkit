import { Schema as S } from 'effect'
import { Calendar } from 'foldkit'
import { Field, Rule, makeRules } from 'foldkit/fieldValidation'

// A domain codec you already maintain, and decode the buffer with on submit.
const EventDate = Calendar.CalendarDateFromIsoString

// Reuse it as a field rule, so the rule can't drift from the codec.
const eventDateRules = makeRules({
  required: 'Event date is required',
  rules: [Rule.fromSchema(EventDate, 'Enter a real date as YYYY-MM-DD')],
})

// The buffer stays a string; decode it to a CalendarDate on submit.
const Model = S.Struct({
  eventDate: Field(S.String),
})
type Model = typeof Model.Type
