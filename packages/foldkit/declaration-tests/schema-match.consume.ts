import {
  Event,
  type RefinedEvent,
  describeRefined,
  matchAny,
  matchNever,
  matchOrElseAny,
  matchOrElseNever,
  matchOrElseUnknown,
  matchUnknown,
} from './schema-match.accepted.js'

declare const event: Event
declare const refinedEvent: RefinedEvent

const neverResult: never = matchNever(event)
const unknownResult: unknown = matchUnknown(event)
const anyResult: string = matchAny(event)
const partialNeverResult: never = matchOrElseNever(event)
const partialUnknownResult: unknown = matchOrElseUnknown(event)
const partialAnyResult: string = matchOrElseAny(event)
const refinedResult: string = describeRefined(refinedEvent)

void neverResult
void unknownResult
void anyResult
void partialNeverResult
void partialUnknownResult
void partialAnyResult
void refinedResult

// @ts-expect-error Relocated inferred matches still reject unknown handlers.
Event.match(refinedEvent, {
  Started: () => 'started',
  Advanced: ({ step }) => `step ${step}`,
  Unknown: () => 'unknown',
})

const namedCasesWithUnknown = {
  Started: () => ({ value: 'started' }),
  Advanced: ({ step }: typeof Event.Advanced.Type) => ({
    value: `step ${step}`,
  }),
  Unknown: () => ({ value: 'unknown' }),
}

const contextualResult: Readonly<{ value: string }> = Event.match(
  event,
  // @ts-expect-error Relocated contextual inference cannot admit unknown handlers.
  namedCasesWithUnknown,
)
void contextualResult

// @ts-expect-error Relocated declarations reject a narrowed explicit Return.
Event.match<string, Event, 'started'>({
  Started: () => 'started',
  Advanced: () => 'advanced',
})

const namedPartialCasesWithUnknown = {
  Advanced: ({ step }: typeof Event.Advanced.Type) => `step ${step}`,
  Unknown: () => 'unknown',
}

const contextualPartialResult: string = Event.matchOrElse(
  event,
  // @ts-expect-error Relocated partial matching rejects unknown handlers.
  namedPartialCasesWithUnknown,
  () => 'started',
)
void contextualPartialResult

Event.matchOrElse<string, Event, 'started'>(
  // @ts-expect-error Relocated declarations reject a narrowed partial Return.
  { Advanced: () => 'started' },
  () => 'started',
)
