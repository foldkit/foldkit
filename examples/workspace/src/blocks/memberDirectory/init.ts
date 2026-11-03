import { Option } from 'effect'

import { MemberDirectoryComposition } from './composition'

export const init = MemberDirectoryComposition.makeInit(() => ({
  model: { query: '', maybeSelectedMemberId: Option.none() },
}))
