import { Array } from 'effect'
import { Command, Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  CancelUploadFile,
  CompletedCancelUploadFile,
  FAKE_FILES,
  SucceededUploadFile,
  UploadFile,
  initialModel,
  update,
  view,
} from './main'

const firstFile = Array.headNonEmpty(FAKE_FILES)

describe('view', () => {
  test('initial view shows the start button and an empty state', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('heading', { name: 'File Uploads' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Upload a file' })).toExist(),
      Scene.expect(Scene.text('Nothing here yet. Start an upload.')).toExist(),
    )
  })

  test('starting an upload shows an Uploading row with a cancel button', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('button', { name: 'Upload a file' })),
      Scene.expect(Scene.text(firstFile.name)).toExist(),
      Scene.expect(Scene.text('Uploading')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Cancel upload 0' })).toExist(),
      Scene.Command.resolve(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
        SucceededUploadFile({ uploadId: 0 }),
      ),
      Scene.expect(Scene.text('Done')).toExist(),
    )
  })

  test('cancelling an upload marks it Cancelled and offers a restart', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('button', { name: 'Upload a file' })),
      Scene.click(Scene.role('button', { name: 'Cancel upload 0' })),
      Scene.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Command.Interruptible.Interrupted(),
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
        SucceededUploadFile({ uploadId: 0 }),
      ),
      Scene.expect(Scene.text('Done')).toExist(),
    )
  })

  test('the cancel all button appears only while an upload is running', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button', { name: 'Cancel all' })).toBeAbsent(),
      Scene.click(Scene.role('button', { name: 'Upload a file' })),
      Scene.expect(Scene.role('button', { name: 'Cancel all' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Cancel all' })),
      Scene.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Command.Interruptible.Interrupted(),
        }),
      ),
      Scene.expect(Scene.role('button', { name: 'Cancel all' })).toBeAbsent(),
      Scene.expect(Scene.text('Cancelled')).toExist(),
    )
  })
})
