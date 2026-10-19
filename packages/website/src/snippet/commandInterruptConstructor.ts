const CancelSaveDraft = SaveDraft.Interrupt(outcome =>
  Message.CompletedCancelSaveDraft({ outcome }),
)

const CancelUploadFile = (uploadId: number) =>
  UploadFile.Interrupt({ uploadId }, outcome =>
    Message.CompletedCancelUploadFile({ uploadId, outcome }),
  )
