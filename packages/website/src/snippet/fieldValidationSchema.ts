import { Schema } from 'effect'
import { Calendar } from 'foldkit'
import { Field, Rule, makeRules } from 'foldkit/fieldValidation'

// A transform Schema: parses a string into a CalendarDate.
const EventDate = Calendar.CalendarDateFromIsoString

// A refinement Schema: brands a string that matches the pattern.
const Slug = Schema.String.check(Schema.isPattern(/^[a-z0-9-]+$/)).pipe(
  Schema.brand('Slug'),
)
type Slug = typeof Slug.Type

// Reuse each Schema as a rule, so the rule can't drift from the Schema.
const eventDateRules = makeRules({
  required: 'Event date is required',
  rules: [Rule.fromSchema(EventDate, 'Enter a real date as YYYY-MM-DD')],
})

const slugRules = makeRules({
  required: 'Slug is required',
  rules: [Rule.fromSchema(Slug, 'Use lowercase letters, numbers, and hyphens')],
})

// Each Field wraps Schema.String, the raw value the control holds.
const Model = Schema.Struct({
  eventDate: Field(Schema.String),
  slug: Field(Schema.String),
})
type Model = typeof Model.Type
