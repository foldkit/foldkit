const CancelUploadFileDueToClickedCancel = (uploadId: number) =>
  UploadFile.Interrupt({ uploadId }, outcome =>
    Message.CompletedCancelUploadFileDueToClickedCancel({
      uploadId,
      outcome,
    }),
  )

const CancelUploadFileDueToSelectedNewFile = (
  uploadId: number,
  nextFile: File,
) =>
  UploadFile.Interrupt({ uploadId }, outcome =>
    Message.CompletedCancelUploadFileDueToSelectedNewFile({
      uploadId,
      nextFile,
      outcome,
    }),
  )
