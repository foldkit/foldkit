import { Array, Option } from 'effect'
import { Interruptible } from 'foldkit/command'
import { Command, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import {
  ApplicationLive,
  CancelUploadFile,
  FAKE_FILES,
  Message,
  UploadFile,
} from './application'

const firstFile = Array.headNonEmpty(FAKE_FILES)
const secondFile = Option.getOrThrow(Array.get(FAKE_FILES, 1))

describe('update', () => {
  it.effect(
    'starting an upload appends an Uploading entry and fires UploadFile',
    () =>
      story(
        ApplicationLive,
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
          Message.CompletedUploadFile({ uploadId: 0 }),
        ),
        model(model => {
          expect(Array.map(model.uploads, upload => upload.status)).toEqual([
            'Done',
          ])
        }),
      ),
  )

  it.effect('cancelling an upload interrupts it and marks it Cancelled', () =>
    story(
      ApplicationLive,
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
    ),
  )

  it.effect(
    'a cancel that lands after completion resolves NotFound and changes nothing',
    () =>
      story(
        ApplicationLive,
        message(Message.ClickedStartUpload()),
        Command.resolve(
          UploadFile({ uploadId: 0, sizeMegabytes: firstFile.sizeMegabytes }),
          Message.CompletedUploadFile({ uploadId: 0 }),
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
      ),
  )

  it.effect('cancelling one upload leaves the other running', () =>
    story(
      ApplicationLive,
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
        Message.CompletedUploadFile({ uploadId: 1 }),
      ),
      model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Cancelled',
          'Done',
        ])
      }),
    ),
  )

  it.effect(
    'a new upload can start while a cancellation is still pending',
    () =>
      story(
        ApplicationLive,
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
          Message.CompletedUploadFile({ uploadId: 1 }),
        ),
        model(model => {
          expect(Array.map(model.uploads, upload => upload.status)).toEqual([
            'Cancelled',
            'Done',
          ])
        }),
      ),
  )

  it.effect('restarting a cancelled upload reuses its id and file', () =>
    story(
      ApplicationLive,
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
        Message.CompletedUploadFile({ uploadId: 0 }),
      ),
      model(model => {
        expect(Array.map(model.uploads, upload => upload.status)).toEqual([
          'Done',
        ])
      }),
    ),
  )

  it.effect('cancel all interrupts every running upload and only those', () =>
    story(
      ApplicationLive,
      message(Message.ClickedStartUpload()),
      message(Message.ClickedStartUpload()),
      message(Message.ClickedStartUpload()),
      Command.resolve(
        UploadFile({ uploadId: 1, sizeMegabytes: secondFile.sizeMegabytes }),
        Message.CompletedUploadFile({ uploadId: 1 }),
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
    ),
  )
})
