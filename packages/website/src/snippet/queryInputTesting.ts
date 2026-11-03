import { Effect, Result } from 'effect'
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
  postsQuery,
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
).pipe(Effect.provide(Query.layer))
