import type { Predicate } from 'effect'

/** An error message for a rule: either a static string, or a function that receives the invalid value. */
export type RuleMessage<A> = string | ((value: A) => string)

/** A tuple of a predicate and error message used for field validation. */
export type Rule<A> = readonly [Predicate.Predicate<A>, RuleMessage<A>]
