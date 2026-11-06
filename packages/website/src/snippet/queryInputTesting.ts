import { Result } from 'effect'
import { Story } from 'foldkit'
import { Query } from 'foldkit/experimental'

import { postsQuery } from './queryDefine'

export const loadPosts = Story.story(
  { block: postsQuery, layer: Query.layer },
  Story.init(),
  Story.inMessage(postsQuery.InMessage.RequestedLoadIfMissing()),
  Story.Command.resolve(
    postsQuery.Fetch,
    postsQuery.Message.CompletedFetch({
      generation: 1,
      result: Result.succeed([{ id: '1', title: 'First post' }]),
    }),
  ),
  Story.expectNoOutMessage(),
)
