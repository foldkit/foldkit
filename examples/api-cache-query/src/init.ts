import { Option } from 'effect'

import { ApplicationComposition, PostsBinding } from './composition'

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    activeTab: 'Posts',
    maybeSelectedPostId: Option.none(),
  },
  steps: [PostsBinding.revalidateOrLoad()],
}))
