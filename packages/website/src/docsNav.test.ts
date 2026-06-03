import { Option } from 'effect'
import { describe, expect, test } from 'vitest'

import { findActiveSectionKey } from './docsNav'

describe('findActiveSectionKey', () => {
  test.each([
    ['Manifesto', 'getStarted'],
    ['CoreModel', 'coreConcepts'],
    ['ComingFromReact', 'forReactDevelopers'],
    ['ProjectOrganization', 'patterns'],
    ['WhyNoJsx', 'faq'],
    ['UiButton', 'foldkitUi'],
    ['AiOverview', 'ai'],
    ['Testing', 'testing'],
    ['BestPracticesKeying', 'bestPractices'],
    ['Examples', 'examples'],
  ])('route %s resolves to the %s section', (routeTag, expectedKey) => {
    expect(
      Option.getOrNull(findActiveSectionKey(routeTag, Option.none())),
    ).toBe(expectedKey)
  })

  test('ApiModule routes resolve to the apiReference section', () => {
    expect(
      Option.getOrNull(findActiveSectionKey('ApiModule', Option.none())),
    ).toBe('apiReference')
  })

  test('an example detail route resolves to the examples section', () => {
    expect(
      Option.getOrNull(
        findActiveSectionKey('ExampleDetail', Option.some('counter')),
      ),
    ).toBe('examples')
  })

  test('a route in no section resolves to none', () => {
    expect(
      Option.getOrNull(findActiveSectionKey('Home', Option.none())),
    ).toBeNull()
  })
})
