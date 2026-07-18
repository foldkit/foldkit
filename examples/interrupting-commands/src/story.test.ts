import { Array, Option } from 'effect'
import { Command, Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  CancelUploadFile,
  ClickedCancelAllUploads,
  ClickedCancelUpload,
  ClickedRestartUpload,
  ClickedStartUpload,
  CompletedCancelUploadFile,
  FAKE_FILES,
  SucceededUploadFile,
  UploadFile,
  initialModel,
  update,
} from './main'

const firstFile = Array.headNonEmpty(FAKE_FILES)
const secondFile = Option.getOrThrow(Array.get(FAKE_FILES, 1))

describe('update', () => {
  test('starting an upload appends an Uploading entry and fires UploadFile', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedStartUpload()),
      Story.model(model => {
        expect(model.uploads).toEqual([
          {
            id: 0,
            fileName: firstFile.name,
            sizeMegabytes: firstFile.sizeMegabytes,
            status: 'Uploading',
          },
        ])
        expect(model.uploadId).toBe(1)
      }),
      Story.Command.expectExact(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
      ),
      Story.Command.resolve(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
        SucceededUploadFile({ uploadId: 0 }),
      ),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Done',
        ])
      }),
    )
  })

  test('cancelling an upload interrupts it and marks it Cancelled', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedStartUpload()),
      Story.message(ClickedCancelUpload({ uploadId: 0 })),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Command.Interruptible.Interrupted(),
        }),
      ),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Cancelled',
        ])
      }),
    )
  })

  test('a cancel that lands after completion resolves NotFound and changes nothing', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedStartUpload()),
      Story.Command.resolve(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
        SucceededUploadFile({ uploadId: 0 }),
      ),
      Story.message(ClickedCancelUpload({ uploadId: 0 })),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Command.Interruptible.NotFound(),
        }),
      ),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Done',
        ])
      }),
    )
  })

  test('cancelling one upload leaves the other running', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedStartUpload()),
      Story.message(ClickedStartUpload()),
      Story.message(ClickedCancelUpload({ uploadId: 0 })),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Command.Interruptible.Interrupted(),
        }),
      ),
      Story.Command.expectExact(
        UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
      ),
      Story.Command.resolve(
        UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
        SucceededUploadFile({ uploadId: 1 }),
      ),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Cancelled',
          'Done',
        ])
      }),
    )
  })

  test('a new upload can start while a cancellation is still pending', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedStartUpload()),
      Story.message(ClickedCancelUpload({ uploadId: 0 })),
      Story.message(ClickedStartUpload()),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Command.Interruptible.Interrupted(),
        }),
      ),
      Story.Command.resolve(
        UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
        SucceededUploadFile({ uploadId: 1 }),
      ),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Cancelled',
          'Done',
        ])
      }),
    )
  })

  test('restarting a cancelled upload reuses its id and file', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedStartUpload()),
      Story.message(ClickedCancelUpload({ uploadId: 0 })),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Command.Interruptible.Interrupted(),
        }),
      ),
      Story.message(ClickedRestartUpload({ uploadId: 0 })),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Uploading',
        ])
      }),
      Story.Command.expectExact(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
      ),
      Story.Command.resolve(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
        SucceededUploadFile({ uploadId: 0 }),
      ),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Done',
        ])
      }),
    )
  })

  test('cancel all interrupts every running upload and only those', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedStartUpload()),
      Story.message(ClickedStartUpload()),
      Story.message(ClickedStartUpload()),
      Story.Command.resolve(
        UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
        SucceededUploadFile({ uploadId: 1 }),
      ),
      Story.message(ClickedCancelAllUploads()),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Command.Interruptible.Interrupted(),
        }),
      ),
      Story.Command.resolve(
        CancelUploadFile({ uploadId: 2 }),
        CompletedCancelUploadFile({
          uploadId: 2,
          outcome: Command.Interruptible.Interrupted(),
        }),
      ),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Cancelled',
          'Done',
          'Cancelled',
        ])
      }),
    )
  })
})
