import { Effect } from 'effect'
import { Command } from 'foldkit'

const sharedReadClock = () => Effect.succeed(Date.now())

export const ReadSharedClock = Command.define(
  'ReadSharedClock',
  { messages: [CompletedReadSharedClock] },
  Effect.succeed(sharedReadClock),
)

export const eagerlyReadClock = sharedReadClock()

const escapedReadClock = () => Effect.succeed(crypto.randomUUID())

export const ReadEscapedClock = Command.define(
  'ReadEscapedClock',
  { messages: [CompletedReadEscapedClock] },
  Effect.succeed(escapedReadClock),
)

invoke(escapedReadClock)

const storedReadClock = () => Effect.succeed(Date.now())

export const ReadStoredClock = Command.define(
  'ReadStoredClock',
  { messages: [CompletedReadStoredClock] },
  Effect.succeed(storedReadClock),
)

const unusedStoredRead = invoke(storedReadClock)

const nestedStoredReadClock = () => Effect.succeed(Math.random())

export const ReadNestedStoredClock = Command.define(
  'ReadNestedStoredClock',
  { messages: [CompletedReadNestedStoredClock] },
  Effect.succeed(nestedStoredReadClock),
)

const unusedStoredReads = {
  read: invoke(nestedStoredReadClock),
}

export const exportedReadClock = () => Effect.succeed(Date.now())

export const ReadExportedClock = Command.define(
  'ReadExportedClock',
  { messages: [CompletedReadExportedClock] },
  Effect.succeed(exportedReadClock),
)

const eagerBuild = Effect.succeed(performance.now())

export const ReadEagerBuild = Command.define(
  'ReadEagerBuild',
  { messages: [CompletedReadEagerBuild] },
  eagerBuild,
)

const readMutableClock = () => Effect.succeed(Math.random())
let mutableReadClock = readMutableClock

export const ReadMutableClock = Command.define(
  'ReadMutableClock',
  { messages: [CompletedReadMutableClock] },
  Effect.succeed(mutableReadClock),
)

mutableReadClock = () => Effect.succeed(0)
