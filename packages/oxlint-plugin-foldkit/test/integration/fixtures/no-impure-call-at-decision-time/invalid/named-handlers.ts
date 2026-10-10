import { Effect } from 'effect'
import { Command } from 'foldkit'

const sharedReadClock = () => Effect.succeed(Date.now())

export const ReadSharedClock = Command.define(
  'ReadSharedClock',
  { messages: [CompletedReadSharedClock], handler: function* () { return sharedReadClock }},
)

export const eagerlyReadClock = sharedReadClock()

const escapedReadClock = () => Effect.succeed(crypto.randomUUID())

export const ReadEscapedClock = Command.define(
  'ReadEscapedClock',
  { messages: [CompletedReadEscapedClock], handler: function* () { return escapedReadClock }},
)

invoke(escapedReadClock)

const storedReadClock = () => Effect.succeed(Date.now())

export const ReadStoredClock = Command.define(
  'ReadStoredClock',
  { messages: [CompletedReadStoredClock], handler: function* () { return storedReadClock }},
)

const unusedStoredRead = invoke(storedReadClock)

const nestedStoredReadClock = () => Effect.succeed(Math.random())

export const ReadNestedStoredClock = Command.define(
  'ReadNestedStoredClock',
  { messages: [CompletedReadNestedStoredClock], handler: function* () { return nestedStoredReadClock }},
)

const unusedStoredReads = {
  read: invoke(nestedStoredReadClock),
}

export const exportedReadClock = () => Effect.succeed(Date.now())

export const ReadExportedClock = Command.define(
  'ReadExportedClock',
  { messages: [CompletedReadExportedClock], handler: function* () { return exportedReadClock }},
)

export const ReadEagerBuild = Command.define(
  'ReadEagerBuild',
  {
    messages: [CompletedReadEagerBuild],
    handler: function* () {
      performance.now()
      return () => Effect.void
    },
  },
)

const readMutableClock = () => Effect.succeed(Math.random())
let mutableReadClock = readMutableClock

export const ReadMutableClock = Command.define(
  'ReadMutableClock',
  { messages: [CompletedReadMutableClock], handler: function* () { return mutableReadClock }},
)

mutableReadClock = () => Effect.succeed(0)
