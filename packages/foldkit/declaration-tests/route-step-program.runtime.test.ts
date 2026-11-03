import { expect, it } from 'vitest'

import {
  LoadDetail,
  PolicyOutMessage,
  applyCombinedPolicy,
  enteredOut,
  exitedOut,
} from './route-step-program.accepted.js'

it('runs matcher-selected Steps', () => {
  expect(applyCombinedPolicy({ activeId: '1' }).commands).toEqual([LoadDetail])
  expect(enteredOut({ activeId: '1' }).outMessage).toEqual(
    PolicyOutMessage.EnteredDetail(),
  )
  expect(exitedOut({ activeId: '1' }).outMessage).toEqual(
    PolicyOutMessage.ExitedDetail(),
  )
})
