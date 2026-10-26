import { expect, it } from 'vitest'

import {
  LoadDetail,
  PolicyOutMessage,
  combinedPolicyStep,
  enteredOutStep,
  exitedOutStep,
} from './route-step-program.accepted.js'

it('runs matcher-selected Steps', () => {
  expect(combinedPolicyStep({ activeId: '1' }).commands).toEqual([LoadDetail])
  expect(enteredOutStep({ activeId: '1' }).outMessage).toEqual(
    PolicyOutMessage.EnteredDetail(),
  )
  expect(exitedOutStep({ activeId: '1' }).outMessage).toEqual(
    PolicyOutMessage.ExitedDetail(),
  )
})
