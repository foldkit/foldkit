import { Array, Match, Option, Schema, pipe } from 'effect'
import { taggedStruct } from 'foldkit/schema'

export type File = typeof File.Type
export type Directory = Readonly<{
  _tag: 'Directory'
  name: string
  entries: ReadonlyArray<FileTreeEntry>
}>
export type FileTreeEntry = File | Directory

export const File = taggedStruct('File', {
  name: Schema.String,
  sizeInBytes: Schema.Number,
})

export const Directory = taggedStruct('Directory', {
  name: Schema.String,
  entries: Schema.Array(
    Schema.suspend((): Schema.Codec<FileTreeEntry> => FileTreeEntry),
  ),
})

export const FileTreeEntry = Schema.Union([File, Directory])

export const fileTree: ReadonlyArray<FileTreeEntry> = [
  Directory({
    name: 'documents',
    entries: [
      File({ name: 'resume.pdf', sizeInBytes: 48_230 }),
      Directory({
        name: 'taxes',
        entries: [
          File({ name: '2024.pdf', sizeInBytes: 182_400 }),
          File({ name: '2025.pdf', sizeInBytes: 196_812 }),
        ],
      }),
    ],
  }),
  Directory({
    name: 'photos',
    entries: [
      Directory({
        name: 'vacation',
        entries: [
          File({ name: 'beach.jpg', sizeInBytes: 2_348_100 }),
          File({ name: 'sunset.jpg', sizeInBytes: 1_982_450 }),
        ],
      }),
    ],
  }),
  File({ name: 'notes.txt', sizeInBytes: 1_204 }),
]

const findDirectoryEntries = (
  entries: ReadonlyArray<FileTreeEntry>,
  name: string,
): Option.Option<ReadonlyArray<FileTreeEntry>> =>
  pipe(
    Array.findFirst(entries, entry => entry.name === name),
    Option.flatMap(entry =>
      Match.value(entry).pipe(
        Match.tagsExhaustive({
          File: () => Option.none(),
          Directory: directory => Option.some(directory.entries),
        }),
      ),
    ),
  )

export const findEntry = (
  path: Array.NonEmptyReadonlyArray<string>,
): Option.Option<FileTreeEntry> => {
  const [parentSegments, entryName] = Array.unappend(path)

  return pipe(
    parentSegments,
    Array.reduce(Option.some(fileTree), (maybeEntries, segment) =>
      Option.flatMap(maybeEntries, entries =>
        findDirectoryEntries(entries, segment),
      ),
    ),
    Option.flatMap(entries =>
      Array.findFirst(entries, entry => entry.name === entryName),
    ),
  )
}

const BYTES_PER_KILOBYTE = 1024
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * 1024

export const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes >= BYTES_PER_MEGABYTE) {
    return `${(sizeInBytes / BYTES_PER_MEGABYTE).toFixed(1)} MB`
  } else if (sizeInBytes >= BYTES_PER_KILOBYTE) {
    return `${(sizeInBytes / BYTES_PER_KILOBYTE).toFixed(1)} KB`
  } else {
    return `${sizeInBytes} B`
  }
}
