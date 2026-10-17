import { Event, type RefinedEvent } from './schema-match.accepted.js'

declare const event: Event
declare const refinedEvent: RefinedEvent

// @ts-expect-error Inferred data-first matches reject unknown handlers.
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
  // @ts-expect-error Contextual output inference cannot select an explicit overload.
  namedCasesWithUnknown,
)
void contextualResult

// @ts-expect-error An explicit Return cannot narrow the declared output.
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
  // @ts-expect-error Contextual partial output cannot admit unknown handlers.
  namedPartialCasesWithUnknown,
  () => 'started',
)
void contextualPartialResult

Event.matchOrElse<string, Event, 'started'>(
  // @ts-expect-error An explicit partial Return cannot narrow its output.
  { Advanced: () => 'started' },
  () => 'started',
)
