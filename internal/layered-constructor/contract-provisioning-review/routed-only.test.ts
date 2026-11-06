import { Effect } from 'effect'
import { Story } from 'foldkit/experimental/layered/testing'
import { expect, test } from 'vitest'

import { Message } from '../contract-provisioning-proof/src/basic'
import { ProvidedRoutedOnlyBlock, RoutedChildBinding } from './routed-only'

test('a parent without local Messages routes child dispatch and applies its OutMessage policy', () =>
  Effect.runPromise(
    Story.story(
      ProvidedRoutedOnlyBlock,
      Story.init(),
      Story.messageIn(
        RoutedChildBinding,
        Message.UpdatedText({ text: 'Routed' }),
      ),
      Story.model(model => expect(model.child.text).toBe('Routed')),
      Story.messageIn(RoutedChildBinding, Message.SubmittedText()),
      Story.expectNoOutMessage(),
    ),
  ))
