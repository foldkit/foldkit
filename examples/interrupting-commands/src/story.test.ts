import { Array, Option } from 'effect'
import { Interruptible } from 'foldkit/command'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  CancelUploadFile,
  FAKE_FILES,
  Message,
  UploadFile,
  initialModel,
  update,
} from './main'

const firstFile = Array.headNonEmpty(FAKE_FILES)
const secondFile = Option.getOrThrow(Array.get(FAKE_FILES, 1))

describe('update', () => {
  test('starting an upload appends an Uploading entry and fires UploadFile', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedStartUpload()),
      model(model => {
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
      Command.expectExact(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
      ),
      Command.resolve(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
        Message.SucceededUploadFile({ uploadId: 0 }),
      ),
      model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Done',
        ])
      }),
    )
  })

  test('cancelling an upload interrupts it and marks it Cancelled', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedStartUpload()),
      message(Message.ClickedCancelUpload({ uploadId: 0 })),
      Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        Message.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.Outcome.Interrupted(),
        }),
      ),
      Command.expectNone(),
      model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Cancelled',
        ])
      }),
    )
  })

  test('a cancel that lands after completion resolves NotFound and changes nothing', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedStartUpload()),
      Command.resolve(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
        Message.SucceededUploadFile({ uploadId: 0 }),
      ),
      message(Message.ClickedCancelUpload({ uploadId: 0 })),
      Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        Message.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.Outcome.NotFound(),
        }),
      ),
      model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Done',
        ])
      }),
    )
  })

  test('cancelling one upload leaves the other running', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedStartUpload()),
      message(Message.ClickedStartUpload()),
      message(Message.ClickedCancelUpload({ uploadId: 0 })),
      Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        Message.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.Outcome.Interrupted(),
        }),
      ),
      Command.expectExact(
        UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
      ),
      Command.resolve(
        UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
        Message.SucceededUploadFile({ uploadId: 1 }),
      ),
      model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Cancelled',
          'Done',
        ])
      }),
    )
  })

  test('a new upload can start while a cancellation is still pending', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedStartUpload()),
      message(Message.ClickedCancelUpload({ uploadId: 0 })),
      message(Message.ClickedStartUpload()),
      Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        Message.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.Outcome.Interrupted(),
        }),
      ),
      Command.resolve(
        UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
        Message.SucceededUploadFile({ uploadId: 1 }),
      ),
      model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Cancelled',
          'Done',
        ])
      }),
    )
  })

  test('restarting a cancelled upload reuses its id and file', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedStartUpload()),
      message(Message.ClickedCancelUpload({ uploadId: 0 })),
      Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        Message.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.Outcome.Interrupted(),
        }),
      ),
      message(Message.ClickedRestartUpload({ uploadId: 0 })),
      model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Uploading',
        ])
      }),
      Command.expectExact(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
      ),
      Command.resolve(
        UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
        Message.SucceededUploadFile({ uploadId: 0 }),
      ),
      model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Done',
        ])
      }),
    )
  })

  test('cancel all interrupts every running upload and only those', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedStartUpload()),
      message(Message.ClickedStartUpload()),
      message(Message.ClickedStartUpload()),
      Command.resolve(
        UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
        Message.SucceededUploadFile({ uploadId: 1 }),
      ),
      message(Message.ClickedCancelAllUploads()),
      Command.resolve(
        CancelUploadFile({ uploadId: 0 }),
        Message.CompletedCancelUploadFile({
          uploadId: 0,
          outcome: Interruptible.Outcome.Interrupted(),
        }),
      ),
      Command.resolve(
        CancelUploadFile({ uploadId: 2 }),
        Message.CompletedCancelUploadFile({
          uploadId: 2,
          outcome: Interruptible.Outcome.Interrupted(),
        }),
      ),
      Command.expectNone(),
      model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Cancelled',
          'Done',
          'Cancelled',
        ])
      }),
    )
  })
})
