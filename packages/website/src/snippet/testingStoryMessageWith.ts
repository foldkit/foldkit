import { message, messageWith, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { FrameFeedLive, Message } from './frameFeed'

it.effect('keeps frames from the current session', () =>
  story(
    FrameFeedLive,
    message(Message.ClickedReconnect()),
    messageWith(model =>
      Message.ReceivedFrame({ sessionId: model.sessionId, frame: 'hello' }),
    ),
    model(model => {
      expect(model.frames).toEqual(['hello'])
    }),
  ),
)
