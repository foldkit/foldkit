import { Option } from 'effect'

import { MemberDirectoryComposition } from './composition'
import { makeFieldsStep } from './definition'

export const update = MemberDirectoryComposition.makeUpdate({
  UpdatedQuery: makeFieldsStep.fromMessage(({ value }) => ({
    query: () => value,
    maybeSelectedMemberId: () => Option.none(),
  })),
  ClickedMember: makeFieldsStep.fromMessage(({ memberId }) => ({
    maybeSelectedMemberId: () => Option.some(memberId),
  })),
})
