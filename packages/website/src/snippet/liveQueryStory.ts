import { Array, Option } from 'effect'
import {
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  story,
} from 'foldkit/story'
import { test } from 'vitest'

const args = { boardId: 'kitchen' }

const boardAfter = (seq: number): typeof OrderBoard.Type => ({
  orders: Array.makeBy(seq, index => ({
    id: `order-${index + 1}`,
    item: 'Soup',
    status: 'Queued',
  })),
})

test('a repeated entry produces no second AppliedEntry', () => {
  const watching = orderBoardQuery.requestWatch(orderBoardQuery.init().model, {
    args,
    maybeSnapshot: Option.some({ state: boardAfter(4), cursor: 4 }),
  }).model

  // Build the entry for the session that is running in this Model.
  const session = Option.getOrThrow(
    orderBoardQuery.sessionMessages(watching, args),
  )
  const entry = session.receivedEntry({
    seq: 5,
    state: boardAfter(5),
    meta: { intentId: 'intent-5' },
  })

  story(
    orderBoardQuery.update,
    given(watching),
    message(entry),
    expectOutMessage(
      orderBoardQuery.OutMessage.AppliedEntry({
        args,
        seq: 5,
        maybePreviousCursor: Option.some(4),
        meta: { intentId: 'intent-5' },
      }),
    ),
    message(entry),
    expectNoOutMessage(),
  )
})
