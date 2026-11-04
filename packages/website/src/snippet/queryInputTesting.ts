import { Result } from 'effect'
import { Query } from 'foldkit/experimental'
import {
  Command,
  expectNoOutMessage,
  inMessage,
  init,
  story,
} from 'foldkit/story'

import { postsQuery } from './queryDefine'

export const loadPosts = story(
  { block: postsQuery, layer: Query.layer },
  init(),
  inMessage(postsQuery.InMessage.RequestedLoadIfMissing()),
  Command.resolve(
    postsQuery.Fetch,
    postsQuery.Message.CompletedFetch({
      generation: 1,
      result: Result.succeed([{ id: '1', title: 'First post' }]),
    }),
  ),
  expectNoOutMessage(),
)
