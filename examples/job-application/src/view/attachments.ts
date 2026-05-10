import clsx from 'clsx'
import { Array, Match as M, Number, Option } from 'effect'
import { File, Ui } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import { Attachments } from '../step'

const BYTES_PER_KB = 1024
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB

const formatFileSize = (bytes: number): string =>
  M.value(bytes).pipe(
    M.when(Number.isLessThan(BYTES_PER_KB), () => `${bytes} B`),
    M.when(
      Number.isLessThan(BYTES_PER_MB),
      () => `${(bytes / BYTES_PER_KB).toFixed(1)} KB`,
    ),
    M.orElse(() => `${(bytes / BYTES_PER_MB).toFixed(1)} MB`),
  )

const dropZoneClassName =
  'block cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center transition border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 data-[drag-over]:border-indigo-500 data-[drag-over]:bg-indigo-50'

const fileKey = (file: File.File): string =>
  `${File.name(file)}:${File.size(file)}:${file.lastModified}`

const resumeView = <ParentMessage>(
  resume: File.File,
  toParentMessage: (message: Attachments.Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.keyed('div')(
    'resume-filled',
    [
      h.Class(
        'flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3',
      ),
    ],
    [
      h.div(
        [h.Class('flex items-center gap-3')],
        [
          h.span([h.Class('text-lg')], ['📄']),
          h.div(
            [],
            [
              h.p(
                [h.Class('text-sm font-medium text-gray-900')],
                [File.name(resume)],
              ),
              h.p(
                [h.Class('text-xs text-gray-500')],
                [formatFileSize(File.size(resume))],
              ),
            ],
          ),
        ],
      ),
      h.button(
        [
          h.Type('button'),
          h.OnClick(toParentMessage(Attachments.RemovedResume())),
          h.Class(
            'text-sm text-gray-400 hover:text-red-500 transition cursor-pointer',
          ),
        ],
        ['Remove'],
      ),
    ],
  )
}

const additionalFileView = <ParentMessage>(
  file: File.File,
  fileIndex: number,
  toParentMessage: (message: Attachments.Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.keyed('div')(
    fileKey(file),
    [
      h.Class(
        'flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2',
      ),
    ],
    [
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          h.span([h.Class('text-sm')], ['📎']),
          h.span([h.Class('text-sm text-gray-700')], [File.name(file)]),
          h.span(
            [h.Class('text-xs text-gray-400')],
            [formatFileSize(File.size(file))],
          ),
        ],
      ),
      h.button(
        [
          h.Type('button'),
          h.OnClick(
            toParentMessage(Attachments.RemovedAdditionalFile({ fileIndex })),
          ),
          h.Class(
            'text-xs text-gray-400 hover:text-red-500 transition cursor-pointer',
          ),
        ],
        ['Remove'],
      ),
    ],
  )
}

export const attachmentsView = <ParentMessage>(
  {
    resumeDrop,
    maybeResume,
    additionalFilesDrop,
    additionalFiles,
  }: Attachments.Model,
  toParentMessage: (message: Attachments.Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  const resumeSection = h.div(
    [h.Class('space-y-2')],
    [
      h.h3([h.Class('text-sm font-medium text-gray-700')], ['Resume (PDF)']),
      Option.match(maybeResume, {
        onNone: () =>
          Ui.FileDrop.view({
            model: resumeDrop,
            toParentMessage: message =>
              toParentMessage(Attachments.GotResumeDropMessage({ message })),
            accept: ['application/pdf', '.doc', '.docx'],
            toView: attributes =>
              h.keyed('label')(
                'resume-empty',
                [...attributes.root, h.Class(clsx(dropZoneClassName, 'py-6'))],
                [
                  h.p(
                    [h.Class('text-sm text-gray-600')],
                    ['Drop your resume or click to upload'],
                  ),
                  h.p(
                    [h.Class('text-xs text-gray-400 mt-1')],
                    ['PDF, DOC, or DOCX up to 10MB'],
                  ),
                  h.input(attributes.input),
                ],
              ),
          }),
        onSome: resume => resumeView<ParentMessage>(resume, toParentMessage),
      }),
    ],
  )

  const additionalSection = h.div(
    [h.Class('space-y-2')],
    [
      h.h3(
        [h.Class('text-sm font-medium text-gray-700')],
        ['Additional Files (optional)'],
      ),
      Ui.FileDrop.view({
        model: additionalFilesDrop,
        toParentMessage: message =>
          toParentMessage(
            Attachments.GotAdditionalFilesDropMessage({ message }),
          ),
        multiple: true,
        toView: attributes =>
          h.label(
            [...attributes.root, h.Class(clsx(dropZoneClassName, 'py-8'))],
            [
              h.p(
                [h.Class('text-sm text-gray-500')],
                ['Drag and drop files here, or click to browse'],
              ),
              h.p(
                [h.Class('text-xs text-gray-400 mt-1')],
                ['Cover letters, certifications, portfolios, etc.'],
              ),
              h.input(attributes.input),
            ],
          ),
      }),
      ...Array.match(additionalFiles, {
        onEmpty: () => [],
        onNonEmpty: files => [
          h.div(
            [h.Class('space-y-2')],
            files.map((file, fileIndex) =>
              additionalFileView<ParentMessage>(
                file,
                fileIndex,
                toParentMessage,
              ),
            ),
          ),
        ],
      }),
    ],
  )

  return h.div([h.Class('space-y-6')], [resumeSection, additionalSection])
}
