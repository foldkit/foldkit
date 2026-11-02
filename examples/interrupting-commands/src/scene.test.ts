import { Array } from 'effect'
import { Interruptible } from 'foldkit/command'
import { Command, click, expect, role, scene, text } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import {
  ApplicationLive,
  CancelUploadFile,
  FAKE_FILES,
  Message,
  UploadFile,
} from './application'

const firstFile = Array.headNonEmpty(FAKE_FILES)

describe('view', () => {
  it.effect('initial view shows the start button and an empty state', () =>
    scene(
      ApplicationLive,
      expect(role('heading', { name: 'File Uploads' })).toExist(),
      expect(role('button', { name: 'Upload a file' })).toExist(),
      expect(text('Nothing here yet. Start an upload.')).toExist(),
    ),
  )

  it.effect(
    'starting an upload shows an Uploading row with a cancel button',
    () =>
      scene(
        ApplicationLive,
        click(role('button', { name: 'Upload a file' })),
        expect(text(firstFile.name)).toExist(),
        expect(text('Uploading')).toExist(),
        expect(role('button', { name: 'Cancel upload 0' })).toExist(),
        Command.resolve(
          UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
          Message.CompletedUploadFile({ uploadId: 0 }),
        ),
        expect(text('Done')).toExist(),
      ),
  )

  it.effect(
    'cancelling an upload marks it Cancelled and offers a restart',
    () =>
      scene(
        ApplicationLive,
        click(role('button', { name: 'Upload a file' })),
        click(role('button', { name: 'Cancel upload 0' })),
        Command.resolve(
          CancelUploadFile({ uploadId: 0 }),
          Message.CompletedCancelUploadFile({
            uploadId: 0,
            outcome: Interruptible.Outcome.Interrupted(),
          }),
        ),
        expect(text('Cancelled')).toExist(),
        expect(role('button', { name: 'Restart upload 0' })).toExist(),
        click(role('button', { name: 'Restart upload 0' })),
        expect(text('Uploading')).toExist(),
        Command.resolve(
          UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
          Message.CompletedUploadFile({ uploadId: 0 }),
        ),
        expect(text('Done')).toExist(),
      ),
  )

  it.effect(
    'the cancel all button appears only while an upload is running',
    () =>
      scene(
        ApplicationLive,
        expect(role('button', { name: 'Cancel all' })).toBeAbsent(),
        click(role('button', { name: 'Upload a file' })),
        expect(role('button', { name: 'Cancel all' })).toExist(),
        click(role('button', { name: 'Cancel all' })),
        Command.resolve(
          CancelUploadFile({ uploadId: 0 }),
          Message.CompletedCancelUploadFile({
            uploadId: 0,
            outcome: Interruptible.Outcome.Interrupted(),
          }),
        ),
        expect(role('button', { name: 'Cancel all' })).toBeAbsent(),
        expect(text('Cancelled')).toExist(),
      ),
  )
})
