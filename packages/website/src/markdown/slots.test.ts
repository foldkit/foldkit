import { inertHtml as ih } from 'foldkit/html'
import { describe, expect, test } from 'vitest'

import { type Slots, renderFaqSection, resolveDemo } from './slots'

const stubRenderCopyButton = () => ih.empty
const stubRenderHeadingLink = () => ih.empty

const slotsWithoutShell: Slots<never> = {
  demos: {},
  renderCopyButton: stubRenderCopyButton,
  renderHeadingLink: stubRenderHeadingLink,
}

describe('resolveDemo', () => {
  test('returns the demo the page registered under that name', () => {
    const demo = ih.div([ih.Class('live-demo')], ['demo content'])
    const slots: Slots<'registered'> = {
      demos: { registered: demo },
      renderCopyButton: stubRenderCopyButton,
      renderHeadingLink: stubRenderHeadingLink,
    }

    expect(resolveDemo(slots, 'registered')).toBe(demo)
  })

  test('renders empty for a name no page registered', () => {
    expect(resolveDemo(slotsWithoutShell, 'never-registered')).toEqual(ih.empty)
  })
})

describe('renderFaqSection', () => {
  test('hands the island id, question, and rendered children to the shell', () => {
    const answer = [ih.p([], ['Because it is.'])]
    const wrapped = ih.section([], ['wrapped'])
    const received: Array<{
      id: string
      question: string
      content: ReadonlyArray<unknown>
    }> = []

    const slots: Slots<never> = {
      demos: {},
      renderCopyButton: stubRenderCopyButton,
      renderHeadingLink: stubRenderHeadingLink,
      renderFaq: (id, question, content) => {
        received.push({ id, question, content })
        return wrapped
      },
    }

    expect(renderFaqSection(slots, 'faq-routing', 'How?', answer)).toBe(wrapped)
    expect(received).toEqual([
      { id: 'faq-routing', question: 'How?', content: answer },
    ])
  })

  test('falls back to the question above its answer with no shell supplied', () => {
    const answer = ih.p([], ['Because it is.'])
    const fallback = renderFaqSection(
      slotsWithoutShell,
      'faq-routing',
      'How?',
      [answer],
    )

    expect(fallback).toMatchObject({
      sel: 'div',
      children: [{ sel: 'p', children: [{ text: 'How?' }] }, answer],
    })
  })
})
