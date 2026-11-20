import { Option, Schema } from 'effect'
import { type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { expect, given, scene, selector, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import * as PlaygroundFailure from './playgroundFailure'

const REASON = 'npm install exited with code 1.'
const PROCESS_OUTPUT = 'npm error code E500'
const disclosure = selector('details')
const failureWithOutput = PlaygroundFailure.start({
  reason: REASON,
  maybeProcessOutput: Option.some(PROCESS_OUTPUT),
})
const Message = defineMessageUnion({
  ToggledProcessOutput: { isOpen: Schema.Boolean },
})
type Message = typeof Message.Type

const failureApp = {
  update: (state: PlaygroundFailure.State, { isOpen }: Message) => ({
    model: PlaygroundFailure.setProcessOutputOpen(state, isOpen),
  }),
  view: (state: PlaygroundFailure.State, h: HtmlBuilder<Message>) =>
    PlaygroundFailure.view(
      state,
      isOpen => Message.ToggledProcessOutput({ isOpen }),
      h,
    ),
}

describe('playground failure', () => {
  test('keeps the process output behind a closed disclosure', () => {
    scene(
      failureApp,
      given(failureWithOutput),
      expect(text(REASON)).toExist(),
      expect(disclosure).toHaveHandler('toggle'),
      expect(disclosure).toHaveAttr('open', 'false'),
      expect(disclosure).toContainText(PROCESS_OUTPUT),
    )
  })

  test('opens the disclosure from the Model', () => {
    scene(
      failureApp,
      given(PlaygroundFailure.setProcessOutputOpen(failureWithOutput, true)),
      expect(disclosure).toHaveAttr('open', 'true'),
    )
  })

  test('renders no disclosure without process output', () => {
    scene(
      failureApp,
      given(
        PlaygroundFailure.start({
          reason: REASON,
          maybeProcessOutput: Option.none(),
        }),
      ),
      expect(text(REASON)).toExist(),
      expect(disclosure).toBeAbsent(),
    )
  })
})
