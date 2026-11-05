import { Option } from 'effect'

import { makeFieldsStep } from './block'
import { MemberDirectoryComposition } from './composition'

export const update = MemberDirectoryComposition.makeUpdate({
  UpdatedQuery: makeFieldsStep.fromMessage(({ value }) => ({
    query: () => value,
    maybeSelectedMemberId: () => Option.none(),
  })),
  ClickedMember: makeFieldsStep.fromMessage(({ memberId }) => ({
    maybeSelectedMemberId: () => Option.some(memberId),
  })),
})
