import { Effect } from 'effect'
import { Command } from 'foldkit'

const sharedReadClock = () => Effect.succeed(Date.now())

export const ReadSharedClock = Command.define('ReadSharedClock', {
  messages: [CompletedReadSharedClock],
})

export const ReadSharedClockLive = ReadSharedClock.toLayer(
  Effect.gen(function* () {
    return sharedReadClock
  }),
)

export const eagerlyReadClock = sharedReadClock()

const escapedReadClock = () => Effect.succeed(crypto.randomUUID())

export const ReadEscapedClock = Command.define('ReadEscapedClock', {
  messages: [CompletedReadEscapedClock],
})

export const ReadEscapedClockLive = ReadEscapedClock.toLayer(
  Effect.gen(function* () {
    return escapedReadClock
  }),
)

invoke(escapedReadClock)

const storedReadClock = () => Effect.succeed(Date.now())

export const ReadStoredClock = Command.define('ReadStoredClock', {
  messages: [CompletedReadStoredClock],
})

export const ReadStoredClockLive = ReadStoredClock.toLayer(
  Effect.gen(function* () {
    return storedReadClock
  }),
)

const unusedStoredRead = invoke(storedReadClock)

const nestedStoredReadClock = () => Effect.succeed(Math.random())

export const ReadNestedStoredClock = Command.define('ReadNestedStoredClock', {
  messages: [CompletedReadNestedStoredClock],
})

export const ReadNestedStoredClockLive = ReadNestedStoredClock.toLayer(
  Effect.gen(function* () {
    return nestedStoredReadClock
  }),
)

const unusedStoredReads = {
  read: invoke(nestedStoredReadClock),
}

export const exportedReadClock = () => Effect.succeed(Date.now())

export const ReadExportedClock = Command.define('ReadExportedClock', {
  messages: [CompletedReadExportedClock],
})

export const ReadExportedClockLive = ReadExportedClock.toLayer(
  Effect.gen(function* () {
    return exportedReadClock
  }),
)

export const ReadEagerBuild = Command.define(
  'ReadEagerBuild',
  {
    messages: [CompletedReadEagerBuild],
  },
)

export const ReadEagerBuildLive = ReadEagerBuild.toLayer(
  Effect.succeed(makeReadHandler(performance.now())),
)

const readMutableClock = () => Effect.succeed(Math.random())
let mutableReadClock = readMutableClock

export const ReadMutableClock = Command.define('ReadMutableClock', {
  messages: [CompletedReadMutableClock],
})

export const ReadMutableClockLive = ReadMutableClock.toLayer(
  Effect.gen(function* () {
    return mutableReadClock
  }),
)

mutableReadClock = () => Effect.succeed(0)
