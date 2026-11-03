import { Array, Option, Schema, String, pipe } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { supportedTlds } from './tld'

export const DomainName = Schema.Struct({
  name: Schema.String,
  tld: Schema.String,
})
export type DomainName = typeof DomainName.Type

const Price = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))

export const DomainQuote = Schema.Struct({
  price: Price,
  renewalPrice: Price,
  years: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 10 })),
  isPremium: Schema.Boolean,
})
export type DomainQuote = typeof DomainQuote.Type

export const Domain = defineTaggedUnion({
  Available: { ...DomainName.fields, ...DomainQuote.fields },
  Unconfirmed: DomainName.fields,
})
export type Domain = typeof Domain.Type
export type AvailableDomain = typeof Domain.Available.Type

const featuredTlds = [
  'com',
  'dev',
  'app',
  'io',
  'ai',
  'xyz',
  'org',
  'me',
  'net',
  'tech',
  'space',
  'cloud',
  'studio',
  'sh',
  'design',
  'co',
  'site',
  'online',
  'store',
  'agency',
  'world',
  'run',
  'page',
  'tools',
]

export const domainTlds = Array.appendAll(
  featuredTlds,
  Array.filter(supportedTlds, tld => !Array.contains(featuredTlds, tld)),
)

export const DomainCandidateRange = Schema.Struct({
  offset: Schema.Int.check(
    Schema.isBetween({ minimum: 0, maximum: domainTlds.length - 1 }),
  ),
  limit: Schema.Int.check(
    Schema.isBetween({ minimum: 1, maximum: domainTlds.length }),
  ),
})
export type DomainCandidateRange = typeof DomainCandidateRange.Type

export const DomainLabel = Schema.String.check(
  Schema.isPattern(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/),
)
export type DomainLabel = typeof DomainLabel.Type

export const domainCandidates = (label: string) =>
  Array.map(domainTlds, tld =>
    DomainName.make({ name: `${label}.${tld}`, tld }),
  )

export const queryToMaybeDomainLabel = (
  query: string,
): Option.Option<DomainLabel> => {
  const label = pipe(
    query,
    String.trim,
    String.toLowerCase,
    String.replace(/^https?:\/\//, ''),
    String.split(/[./]/),
    Array.headNonEmpty,
  )

  return Schema.decodeOption(DomainLabel)(label)
}
