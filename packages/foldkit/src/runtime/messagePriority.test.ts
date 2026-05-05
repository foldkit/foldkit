import { describe, expect, it } from 'vitest'

import { type EnvelopedMessage, orderByPriority } from './messagePriority.js'

type TestMessage = Readonly<{ tag: string }>

const high = (tag: string): EnvelopedMessage<TestMessage> => ({
  priority: 'High',
  message: { tag },
})

const normal = (tag: string): EnvelopedMessage<TestMessage> => ({
  priority: 'Normal',
  message: { tag },
})

const tags = (messages: ReadonlyArray<TestMessage>): ReadonlyArray<string> =>
  messages.map(message => message.tag)

describe('orderByPriority', () => {
  it('returns an empty array when the batch is empty', () => {
    expect(orderByPriority([])).toEqual([])
  })

  it('places a High envelope before a Normal envelope queued earlier', () => {
    const result = orderByPriority([normal('first-normal'), high('first-high')])

    expect(tags(result)).toEqual(['first-high', 'first-normal'])
  })

  it('preserves FIFO order within the High priority class', () => {
    const result = orderByPriority([high('a'), high('b'), high('c')])

    expect(tags(result)).toEqual(['a', 'b', 'c'])
  })

  it('preserves FIFO order within the Normal priority class', () => {
    const result = orderByPriority([normal('a'), normal('b'), normal('c')])

    expect(tags(result)).toEqual(['a', 'b', 'c'])
  })

  it('preserves FIFO order within each priority class when the batch interleaves', () => {
    const result = orderByPriority([
      high('h1'),
      normal('n1'),
      high('h2'),
      normal('n2'),
      high('h3'),
    ])

    expect(tags(result)).toEqual(['h1', 'h2', 'h3', 'n1', 'n2'])
  })

  it('handles a Normal-only batch', () => {
    const result = orderByPriority([normal('only-1'), normal('only-2')])

    expect(tags(result)).toEqual(['only-1', 'only-2'])
  })

  it('handles a High-only batch', () => {
    const result = orderByPriority([high('only-1'), high('only-2')])

    expect(tags(result)).toEqual(['only-1', 'only-2'])
  })

  it('processes a single Normal envelope', () => {
    const result = orderByPriority([normal('solo')])

    expect(tags(result)).toEqual(['solo'])
  })

  it('processes a single High envelope', () => {
    const result = orderByPriority([high('solo')])

    expect(tags(result)).toEqual(['solo'])
  })
})
