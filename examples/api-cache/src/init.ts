import { HashMap, Option } from 'effect'

import { FetchPosts } from './command'
import { ApplicationComposition } from './composition'
import { PostsData, StatsData } from './model'

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    activeTab: 'Posts',
    posts: PostsData.Loading(),
    postDetailById: HashMap.empty(),
    maybeSelectedPostId: Option.none(),
    stats: StatsData.Idle(),
  },
  commands: [FetchPosts()],
}))
