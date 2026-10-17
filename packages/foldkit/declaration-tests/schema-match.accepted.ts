import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const Event = defineTaggedUnion({
  Started: {},
  Advanced: { step: Schema.Number },
})
export type Event = typeof Event.Type

const fail = (): never => {
  throw new Error('match failed')
}

export const matchNever = Event.match<never>({
  Started: fail,
  Advanced: fail,
})

export const matchUnknown = Event.match<unknown>({
  Started: () => 'started',
  Advanced: ({ step }) => step,
})

// oxlint-disable-next-line typescript/no-explicit-any -- This fixture verifies the explicit any return contract.
export const matchAny = Event.match<any>({
  Started: () => 'started',
  Advanced: ({ step }) => step,
})

export const matchOrElseNever = Event.matchOrElse<never>(
  { Advanced: fail },
  fail,
)

export const matchOrElseUnknown = Event.matchOrElse<unknown>(
  { Advanced: ({ step }) => step },
  ({ _tag }) => _tag,
)

// oxlint-disable-next-line typescript/no-explicit-any -- This fixture verifies the explicit any fallback return contract.
export const matchOrElseAny = Event.matchOrElse<any>(
  { Advanced: ({ step }) => step },
  ({ _tag }) => _tag,
)

export type RefinedEvent =
  | typeof Event.Started.Type
  | Readonly<{ _tag: 'Advanced'; step: 1 | 2 }>

const describeStep = (step: 1 | 2): string => `step ${step}`

export const describeRefined = (event: RefinedEvent) =>
  Event.match(event, {
    Started: () => 'started',
    Advanced: ({ step }) => describeStep(step),
  })
