import { Array } from 'effect'
import { Scene } from 'foldkit'
import { Interruptible } from 'foldkit/command'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { CancelUploadFile, UploadFile } from './command'
import { ApplicationBlock, layer } from './index'
import { initialModel } from './init'
import { Message } from './message'
import { FAKE_FILES } from './update'

const firstFile = Array.headNonEmpty(FAKE_FILES)

describe('view', () => {
  it.effect('initial view shows the start button and an empty state', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.expect(Scene.role('heading', { name: 'File Uploads' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Upload a file' })).toExist(),
      Scene.expect(Scene.text('Nothing here yet. Start an upload.')).toExist(),
    ),
  )

  it.effect(
    'starting an upload shows an Uploading row with a cancel button',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.click(Scene.role('button', { name: 'Upload a file' })),
        Scene.expect(Scene.text(firstFile.name)).toExist(),
        Scene.expect(Scene.text('Uploading')).toExist(),
        Scene.expect(
          Scene.role('button', { name: 'Cancel upload 0' }),
        ).toExist(),
        Scene.Command.resolve(
          UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
          Message.CompletedUploadFile({ uploadId: 0 }),
        ),
        Scene.expect(Scene.text('Done')).toExist(),
      ),
  )

  it.effect(
    'cancelling an upload marks it Cancelled and offers a restart',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.click(Scene.role('button', { name: 'Upload a file' })),
        Scene.click(Scene.role('button', { name: 'Cancel upload 0' })),
        Scene.Command.resolve(
          CancelUploadFile({ uploadId: 0 }),
          Message.CompletedCancelUploadFile({
            uploadId: 0,
            outcome: Interruptible.Outcome.Interrupted(),
          }),
        ),
        Scene.expect(Scene.text('Cancelled')).toExist(),
        Scene.expect(
          Scene.role('button', { name: 'Restart upload 0' }),
        ).toExist(),
        Scene.click(Scene.role('button', { name: 'Restart upload 0' })),
        Scene.expect(Scene.text('Uploading')).toExist(),
        Scene.Command.resolve(
          UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
          Message.CompletedUploadFile({ uploadId: 0 }),
        ),
        Scene.expect(Scene.text('Done')).toExist(),
      ),
  )

  it.effect(
    'the cancel all button appears only while an upload is running',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.expect(Scene.role('button', { name: 'Cancel all' })).toBeAbsent(),
        Scene.click(Scene.role('button', { name: 'Upload a file' })),
        Scene.expect(Scene.role('button', { name: 'Cancel all' })).toExist(),
        Scene.click(Scene.role('button', { name: 'Cancel all' })),
        Scene.Command.resolve(
          CancelUploadFile({ uploadId: 0 }),
          Message.CompletedCancelUploadFile({
            uploadId: 0,
            outcome: Interruptible.Outcome.Interrupted(),
          }),
        ),
        Scene.expect(Scene.role('button', { name: 'Cancel all' })).toBeAbsent(),
        Scene.expect(Scene.text('Cancelled')).toExist(),
      ),
  )
})
