import { File } from 'foldkit'
import { html } from 'foldkit/html'

const {
  div,
  input,
  Class,
  Key,
  Type,
  Accept,
  Multiple,
  OnFileChange,
  AllowDrop,
  OnDragEnter,
  OnDragLeave,
  OnDropFiles,
} = html<Message>()

const resumePicker = (model: Model) =>
  input([
    Key('resume-input'),
    Type('file'),
    Accept('application/pdf'),
    OnFileChange(files => SelectedResume({ files })),
  ])

const attachmentsDropZone = (model: Model) =>
  div(
    [
      Key('attachments-drop-zone'),
      Class(
        model.isDraggingOver
          ? 'border-2 border-dashed border-accent-500 bg-accent-50'
          : 'border-2 border-dashed border-gray-300',
      ),
      OnDragEnter(StartedDragOver()),
      OnDragLeave(StoppedDragOver()),
      AllowDrop(),
      OnDropFiles(files => DroppedAttachments({ files })),
    ],
    ['Drop files here, or use the Browse button below.'],
  )
