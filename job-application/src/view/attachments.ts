import clsx from 'clsx'
import { Array, Match as M, Number, Option } from 'effect'
import { File, Ui } from 'foldkit'
import { type Html } from 'foldkit/html'

import {
  Class,
  OnClick,
  Type,
  button,
  div,
  h3,
  input,
  keyed,
  label,
  p,
  span,
} from '../html'
import { GotAttachmentsMessage } from '../message'
import { Attachments } from '../step'

const BYTES_PER_KB = 1024
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB

const formatFileSize = (bytes: number): string =>
  M.value(bytes).pipe(
    M.when(Number.lessThan(BYTES_PER_KB), () => `${bytes} B`),
    M.when(
      Number.lessThan(BYTES_PER_MB),
      () => `${(bytes / BYTES_PER_KB).toFixed(1)} KB`,
    ),
    M.orElse(() => `${(bytes / BYTES_PER_MB).toFixed(1)} MB`),
  )

const dropZoneClassName =
  'block cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center transition border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 data-[drag-over]:border-indigo-500 data-[drag-over]:bg-indigo-50'

const fileKey = (file: File.File): string =>
  `${File.name(file)}:${File.size(file)}:${file.lastModified}`

const resumeView = (resume: File.File): Html =>
  keyed('div')(
    'resume-filled',
    [
      Class(
        'flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3',
      ),
    ],
    [
      div(
        [Class('flex items-center gap-3')],
        [
          span([Class('text-lg')], ['\uD83D\uDCC4']),
          div(
            [],
            [
              p(
                [Class('text-sm font-medium text-gray-900')],
                [File.name(resume)],
              ),
              p(
                [Class('text-xs text-gray-500')],
                [formatFileSize(File.size(resume))],
              ),
            ],
          ),
        ],
      ),
      button(
        [
          Type('button'),
          OnClick(
            GotAttachmentsMessage({ message: Attachments.RemovedResume() }),
          ),
          Class(
            'text-sm text-gray-400 hover:text-red-500 transition cursor-pointer',
          ),
        ],
        ['Remove'],
      ),
    ],
  )

const additionalFileView = (file: File.File, fileIndex: number): Html =>
  keyed('div')(
    fileKey(file),
    [
      Class(
        'flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2',
      ),
    ],
    [
      div(
        [Class('flex items-center gap-2')],
        [
          span([Class('text-sm')], ['\uD83D\uDCCE']),
          span([Class('text-sm text-gray-700')], [File.name(file)]),
          span(
            [Class('text-xs text-gray-400')],
            [formatFileSize(File.size(file))],
          ),
        ],
      ),
      button(
        [
          Type('button'),
          OnClick(
            GotAttachmentsMessage({
              message: Attachments.RemovedAdditionalFile({ fileIndex }),
            }),
          ),
          Class(
            'text-xs text-gray-400 hover:text-red-500 transition cursor-pointer',
          ),
        ],
        ['Remove'],
      ),
    ],
  )

export const attachmentsView = ({
  resumeDrop,
  maybeResume,
  additionalFilesDrop,
  additionalFiles,
}: Attachments.Model): Html => {
  const resumeSection = div(
    [Class('space-y-2')],
    [
      h3([Class('text-sm font-medium text-gray-700')], ['Resume (PDF)']),
      Option.match(maybeResume, {
        onNone: () =>
          Ui.FileDrop.view({
            model: resumeDrop,
            toParentMessage: message =>
              GotAttachmentsMessage({
                message: Attachments.GotResumeDropMessage({ message }),
              }),
            accept: ['application/pdf', '.doc', '.docx'],
            toView: attributes =>
              keyed('label')(
                'resume-empty',
                [...attributes.root, Class(clsx(dropZoneClassName, 'py-6'))],
                [
                  p(
                    [Class('text-sm text-gray-600')],
                    ['Drop your resume or click to upload'],
                  ),
                  p(
                    [Class('text-xs text-gray-400 mt-1')],
                    ['PDF, DOC, or DOCX up to 10MB'],
                  ),
                  input(attributes.input),
                ],
              ),
          }),
        onSome: resumeView,
      }),
    ],
  )

  const additionalSection = div(
    [Class('space-y-2')],
    [
      h3(
        [Class('text-sm font-medium text-gray-700')],
        ['Additional Files (optional)'],
      ),
      Ui.FileDrop.view({
        model: additionalFilesDrop,
        toParentMessage: message =>
          GotAttachmentsMessage({
            message: Attachments.GotAdditionalFilesDropMessage({ message }),
          }),
        multiple: true,
        toView: attributes =>
          label(
            [...attributes.root, Class(clsx(dropZoneClassName, 'py-8'))],
            [
              p(
                [Class('text-sm text-gray-500')],
                ['Drag and drop files here, or click to browse'],
              ),
              p(
                [Class('text-xs text-gray-400 mt-1')],
                ['Cover letters, certifications, portfolios, etc.'],
              ),
              input(attributes.input),
            ],
          ),
      }),
      ...Array.match(additionalFiles, {
        onEmpty: () => [],
        onNonEmpty: files => [
          div([Class('space-y-2')], files.map(additionalFileView)),
        ],
      }),
    ],
  )

  return div([Class('space-y-6')], [resumeSection, additionalSection])
}
