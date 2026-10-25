import { Context, Effect, Layer, Option, Schema } from 'effect'
import { Program } from 'foldkit'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import type { Element as ElementProgram } from 'foldkit/program'
import type * as Update from 'foldkit/update'

const WarmupModel = Schema.Struct({ value: Schema.Number })
const WarmupMessage = defineMessageUnion({ CompletedWarmup: {} })

// oxlint-disable-next-line effecttsgo/floating-effect
Effect.void
Layer.empty
Option.none()
Block.makeDefinition('Application', {
  Model: WarmupModel,
  Message: WarmupMessage,
})
Context.Service
Block.makeDefinition('TypePerformanceWarmup', {
  Model: WarmupModel,
  Message: WarmupMessage,
})

export type WarmupStep = Update.Step<
  typeof WarmupModel.Type,
  typeof WarmupMessage.Type
>
export type WarmupElement = ElementProgram

const WorkerModel = Schema.Struct({ value: Schema.Number })
type WorkerModel = typeof WorkerModel.Type

const WorkerMessage = defineMessageUnion({ RequestedRun: {}, CompletedRun: {} })
type WorkerMessage = typeof WorkerMessage.Type

class Clock extends Context.Service<
  Clock,
  Readonly<{ run: Effect.Effect<void> }>
>()('TypePerformanceWorkerClock') {}
const ClockLayer = Layer.succeed(Clock, { run: Effect.void })

const TypePerformanceWorkerDefinition = Block.makeDefinition(
  'TypePerformanceWorker',
  {
    Model: WorkerModel,
    Message: WorkerMessage,
  },
)

const Run001 = TypePerformanceWorkerDefinition.makeCommand('Run001', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run002 = TypePerformanceWorkerDefinition.makeCommand('Run002', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run003 = TypePerformanceWorkerDefinition.makeCommand('Run003', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run004 = TypePerformanceWorkerDefinition.makeCommand('Run004', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run005 = TypePerformanceWorkerDefinition.makeCommand('Run005', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run006 = TypePerformanceWorkerDefinition.makeCommand('Run006', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run007 = TypePerformanceWorkerDefinition.makeCommand('Run007', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run008 = TypePerformanceWorkerDefinition.makeCommand('Run008', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run009 = TypePerformanceWorkerDefinition.makeCommand('Run009', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run010 = TypePerformanceWorkerDefinition.makeCommand('Run010', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run011 = TypePerformanceWorkerDefinition.makeCommand('Run011', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run012 = TypePerformanceWorkerDefinition.makeCommand('Run012', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run013 = TypePerformanceWorkerDefinition.makeCommand('Run013', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run014 = TypePerformanceWorkerDefinition.makeCommand('Run014', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run015 = TypePerformanceWorkerDefinition.makeCommand('Run015', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run016 = TypePerformanceWorkerDefinition.makeCommand('Run016', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run017 = TypePerformanceWorkerDefinition.makeCommand('Run017', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run018 = TypePerformanceWorkerDefinition.makeCommand('Run018', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run019 = TypePerformanceWorkerDefinition.makeCommand('Run019', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run020 = TypePerformanceWorkerDefinition.makeCommand('Run020', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run021 = TypePerformanceWorkerDefinition.makeCommand('Run021', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run022 = TypePerformanceWorkerDefinition.makeCommand('Run022', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run023 = TypePerformanceWorkerDefinition.makeCommand('Run023', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run024 = TypePerformanceWorkerDefinition.makeCommand('Run024', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run025 = TypePerformanceWorkerDefinition.makeCommand('Run025', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run026 = TypePerformanceWorkerDefinition.makeCommand('Run026', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run027 = TypePerformanceWorkerDefinition.makeCommand('Run027', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run028 = TypePerformanceWorkerDefinition.makeCommand('Run028', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run029 = TypePerformanceWorkerDefinition.makeCommand('Run029', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run030 = TypePerformanceWorkerDefinition.makeCommand('Run030', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run031 = TypePerformanceWorkerDefinition.makeCommand('Run031', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run032 = TypePerformanceWorkerDefinition.makeCommand('Run032', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run033 = TypePerformanceWorkerDefinition.makeCommand('Run033', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run034 = TypePerformanceWorkerDefinition.makeCommand('Run034', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run035 = TypePerformanceWorkerDefinition.makeCommand('Run035', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run036 = TypePerformanceWorkerDefinition.makeCommand('Run036', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run037 = TypePerformanceWorkerDefinition.makeCommand('Run037', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run038 = TypePerformanceWorkerDefinition.makeCommand('Run038', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run039 = TypePerformanceWorkerDefinition.makeCommand('Run039', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run040 = TypePerformanceWorkerDefinition.makeCommand('Run040', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run041 = TypePerformanceWorkerDefinition.makeCommand('Run041', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run042 = TypePerformanceWorkerDefinition.makeCommand('Run042', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run043 = TypePerformanceWorkerDefinition.makeCommand('Run043', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run044 = TypePerformanceWorkerDefinition.makeCommand('Run044', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run045 = TypePerformanceWorkerDefinition.makeCommand('Run045', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run046 = TypePerformanceWorkerDefinition.makeCommand('Run046', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run047 = TypePerformanceWorkerDefinition.makeCommand('Run047', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run048 = TypePerformanceWorkerDefinition.makeCommand('Run048', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run049 = TypePerformanceWorkerDefinition.makeCommand('Run049', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run050 = TypePerformanceWorkerDefinition.makeCommand('Run050', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run051 = TypePerformanceWorkerDefinition.makeCommand('Run051', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run052 = TypePerformanceWorkerDefinition.makeCommand('Run052', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run053 = TypePerformanceWorkerDefinition.makeCommand('Run053', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run054 = TypePerformanceWorkerDefinition.makeCommand('Run054', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run055 = TypePerformanceWorkerDefinition.makeCommand('Run055', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run056 = TypePerformanceWorkerDefinition.makeCommand('Run056', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run057 = TypePerformanceWorkerDefinition.makeCommand('Run057', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run058 = TypePerformanceWorkerDefinition.makeCommand('Run058', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run059 = TypePerformanceWorkerDefinition.makeCommand('Run059', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run060 = TypePerformanceWorkerDefinition.makeCommand('Run060', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run061 = TypePerformanceWorkerDefinition.makeCommand('Run061', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run062 = TypePerformanceWorkerDefinition.makeCommand('Run062', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run063 = TypePerformanceWorkerDefinition.makeCommand('Run063', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run064 = TypePerformanceWorkerDefinition.makeCommand('Run064', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run065 = TypePerformanceWorkerDefinition.makeCommand('Run065', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run066 = TypePerformanceWorkerDefinition.makeCommand('Run066', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run067 = TypePerformanceWorkerDefinition.makeCommand('Run067', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run068 = TypePerformanceWorkerDefinition.makeCommand('Run068', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run069 = TypePerformanceWorkerDefinition.makeCommand('Run069', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run070 = TypePerformanceWorkerDefinition.makeCommand('Run070', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run071 = TypePerformanceWorkerDefinition.makeCommand('Run071', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run072 = TypePerformanceWorkerDefinition.makeCommand('Run072', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run073 = TypePerformanceWorkerDefinition.makeCommand('Run073', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run074 = TypePerformanceWorkerDefinition.makeCommand('Run074', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run075 = TypePerformanceWorkerDefinition.makeCommand('Run075', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run076 = TypePerformanceWorkerDefinition.makeCommand('Run076', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run077 = TypePerformanceWorkerDefinition.makeCommand('Run077', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run078 = TypePerformanceWorkerDefinition.makeCommand('Run078', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run079 = TypePerformanceWorkerDefinition.makeCommand('Run079', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run080 = TypePerformanceWorkerDefinition.makeCommand('Run080', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run081 = TypePerformanceWorkerDefinition.makeCommand('Run081', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run082 = TypePerformanceWorkerDefinition.makeCommand('Run082', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run083 = TypePerformanceWorkerDefinition.makeCommand('Run083', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run084 = TypePerformanceWorkerDefinition.makeCommand('Run084', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run085 = TypePerformanceWorkerDefinition.makeCommand('Run085', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run086 = TypePerformanceWorkerDefinition.makeCommand('Run086', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run087 = TypePerformanceWorkerDefinition.makeCommand('Run087', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run088 = TypePerformanceWorkerDefinition.makeCommand('Run088', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run089 = TypePerformanceWorkerDefinition.makeCommand('Run089', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run090 = TypePerformanceWorkerDefinition.makeCommand('Run090', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run091 = TypePerformanceWorkerDefinition.makeCommand('Run091', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run092 = TypePerformanceWorkerDefinition.makeCommand('Run092', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run093 = TypePerformanceWorkerDefinition.makeCommand('Run093', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run094 = TypePerformanceWorkerDefinition.makeCommand('Run094', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run095 = TypePerformanceWorkerDefinition.makeCommand('Run095', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run096 = TypePerformanceWorkerDefinition.makeCommand('Run096', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run097 = TypePerformanceWorkerDefinition.makeCommand('Run097', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run098 = TypePerformanceWorkerDefinition.makeCommand('Run098', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run099 = TypePerformanceWorkerDefinition.makeCommand('Run099', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run100 = TypePerformanceWorkerDefinition.makeCommand('Run100', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run101 = TypePerformanceWorkerDefinition.makeCommand('Run101', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run102 = TypePerformanceWorkerDefinition.makeCommand('Run102', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run103 = TypePerformanceWorkerDefinition.makeCommand('Run103', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run104 = TypePerformanceWorkerDefinition.makeCommand('Run104', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run105 = TypePerformanceWorkerDefinition.makeCommand('Run105', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run106 = TypePerformanceWorkerDefinition.makeCommand('Run106', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run107 = TypePerformanceWorkerDefinition.makeCommand('Run107', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run108 = TypePerformanceWorkerDefinition.makeCommand('Run108', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run109 = TypePerformanceWorkerDefinition.makeCommand('Run109', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run110 = TypePerformanceWorkerDefinition.makeCommand('Run110', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run111 = TypePerformanceWorkerDefinition.makeCommand('Run111', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run112 = TypePerformanceWorkerDefinition.makeCommand('Run112', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run113 = TypePerformanceWorkerDefinition.makeCommand('Run113', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run114 = TypePerformanceWorkerDefinition.makeCommand('Run114', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run115 = TypePerformanceWorkerDefinition.makeCommand('Run115', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run116 = TypePerformanceWorkerDefinition.makeCommand('Run116', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run117 = TypePerformanceWorkerDefinition.makeCommand('Run117', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run118 = TypePerformanceWorkerDefinition.makeCommand('Run118', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run119 = TypePerformanceWorkerDefinition.makeCommand('Run119', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run120 = TypePerformanceWorkerDefinition.makeCommand('Run120', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run121 = TypePerformanceWorkerDefinition.makeCommand('Run121', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run122 = TypePerformanceWorkerDefinition.makeCommand('Run122', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run123 = TypePerformanceWorkerDefinition.makeCommand('Run123', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run124 = TypePerformanceWorkerDefinition.makeCommand('Run124', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run125 = TypePerformanceWorkerDefinition.makeCommand('Run125', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run126 = TypePerformanceWorkerDefinition.makeCommand('Run126', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run127 = TypePerformanceWorkerDefinition.makeCommand('Run127', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run128 = TypePerformanceWorkerDefinition.makeCommand('Run128', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run129 = TypePerformanceWorkerDefinition.makeCommand('Run129', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run130 = TypePerformanceWorkerDefinition.makeCommand('Run130', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run131 = TypePerformanceWorkerDefinition.makeCommand('Run131', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run132 = TypePerformanceWorkerDefinition.makeCommand('Run132', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run133 = TypePerformanceWorkerDefinition.makeCommand('Run133', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run134 = TypePerformanceWorkerDefinition.makeCommand('Run134', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run135 = TypePerformanceWorkerDefinition.makeCommand('Run135', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run136 = TypePerformanceWorkerDefinition.makeCommand('Run136', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run137 = TypePerformanceWorkerDefinition.makeCommand('Run137', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run138 = TypePerformanceWorkerDefinition.makeCommand('Run138', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run139 = TypePerformanceWorkerDefinition.makeCommand('Run139', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run140 = TypePerformanceWorkerDefinition.makeCommand('Run140', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run141 = TypePerformanceWorkerDefinition.makeCommand('Run141', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run142 = TypePerformanceWorkerDefinition.makeCommand('Run142', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run143 = TypePerformanceWorkerDefinition.makeCommand('Run143', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run144 = TypePerformanceWorkerDefinition.makeCommand('Run144', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run145 = TypePerformanceWorkerDefinition.makeCommand('Run145', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run146 = TypePerformanceWorkerDefinition.makeCommand('Run146', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run147 = TypePerformanceWorkerDefinition.makeCommand('Run147', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run148 = TypePerformanceWorkerDefinition.makeCommand('Run148', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run149 = TypePerformanceWorkerDefinition.makeCommand('Run149', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run150 = TypePerformanceWorkerDefinition.makeCommand('Run150', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run151 = TypePerformanceWorkerDefinition.makeCommand('Run151', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run152 = TypePerformanceWorkerDefinition.makeCommand('Run152', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run153 = TypePerformanceWorkerDefinition.makeCommand('Run153', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run154 = TypePerformanceWorkerDefinition.makeCommand('Run154', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run155 = TypePerformanceWorkerDefinition.makeCommand('Run155', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run156 = TypePerformanceWorkerDefinition.makeCommand('Run156', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run157 = TypePerformanceWorkerDefinition.makeCommand('Run157', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run158 = TypePerformanceWorkerDefinition.makeCommand('Run158', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run159 = TypePerformanceWorkerDefinition.makeCommand('Run159', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run160 = TypePerformanceWorkerDefinition.makeCommand('Run160', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run161 = TypePerformanceWorkerDefinition.makeCommand('Run161', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run162 = TypePerformanceWorkerDefinition.makeCommand('Run162', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run163 = TypePerformanceWorkerDefinition.makeCommand('Run163', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run164 = TypePerformanceWorkerDefinition.makeCommand('Run164', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run165 = TypePerformanceWorkerDefinition.makeCommand('Run165', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run166 = TypePerformanceWorkerDefinition.makeCommand('Run166', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run167 = TypePerformanceWorkerDefinition.makeCommand('Run167', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run168 = TypePerformanceWorkerDefinition.makeCommand('Run168', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run169 = TypePerformanceWorkerDefinition.makeCommand('Run169', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run170 = TypePerformanceWorkerDefinition.makeCommand('Run170', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run171 = TypePerformanceWorkerDefinition.makeCommand('Run171', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run172 = TypePerformanceWorkerDefinition.makeCommand('Run172', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run173 = TypePerformanceWorkerDefinition.makeCommand('Run173', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run174 = TypePerformanceWorkerDefinition.makeCommand('Run174', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run175 = TypePerformanceWorkerDefinition.makeCommand('Run175', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run176 = TypePerformanceWorkerDefinition.makeCommand('Run176', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run177 = TypePerformanceWorkerDefinition.makeCommand('Run177', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run178 = TypePerformanceWorkerDefinition.makeCommand('Run178', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run179 = TypePerformanceWorkerDefinition.makeCommand('Run179', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run180 = TypePerformanceWorkerDefinition.makeCommand('Run180', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run181 = TypePerformanceWorkerDefinition.makeCommand('Run181', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run182 = TypePerformanceWorkerDefinition.makeCommand('Run182', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run183 = TypePerformanceWorkerDefinition.makeCommand('Run183', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run184 = TypePerformanceWorkerDefinition.makeCommand('Run184', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run185 = TypePerformanceWorkerDefinition.makeCommand('Run185', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run186 = TypePerformanceWorkerDefinition.makeCommand('Run186', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run187 = TypePerformanceWorkerDefinition.makeCommand('Run187', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run188 = TypePerformanceWorkerDefinition.makeCommand('Run188', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run189 = TypePerformanceWorkerDefinition.makeCommand('Run189', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run190 = TypePerformanceWorkerDefinition.makeCommand('Run190', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run191 = TypePerformanceWorkerDefinition.makeCommand('Run191', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run192 = TypePerformanceWorkerDefinition.makeCommand('Run192', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run193 = TypePerformanceWorkerDefinition.makeCommand('Run193', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run194 = TypePerformanceWorkerDefinition.makeCommand('Run194', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run195 = TypePerformanceWorkerDefinition.makeCommand('Run195', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run196 = TypePerformanceWorkerDefinition.makeCommand('Run196', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run197 = TypePerformanceWorkerDefinition.makeCommand('Run197', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run198 = TypePerformanceWorkerDefinition.makeCommand('Run198', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run199 = TypePerformanceWorkerDefinition.makeCommand('Run199', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run200 = TypePerformanceWorkerDefinition.makeCommand('Run200', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const runAll = TypePerformanceWorkerDefinition.makeStep(model => ({
  model,
  commands: [
    Run001(),
    Run002(),
    Run003(),
    Run004(),
    Run005(),
    Run006(),
    Run007(),
    Run008(),
    Run009(),
    Run010(),
    Run011(),
    Run012(),
    Run013(),
    Run014(),
    Run015(),
    Run016(),
    Run017(),
    Run018(),
    Run019(),
    Run020(),
    Run021(),
    Run022(),
    Run023(),
    Run024(),
    Run025(),
    Run026(),
    Run027(),
    Run028(),
    Run029(),
    Run030(),
    Run031(),
    Run032(),
    Run033(),
    Run034(),
    Run035(),
    Run036(),
    Run037(),
    Run038(),
    Run039(),
    Run040(),
    Run041(),
    Run042(),
    Run043(),
    Run044(),
    Run045(),
    Run046(),
    Run047(),
    Run048(),
    Run049(),
    Run050(),
    Run051(),
    Run052(),
    Run053(),
    Run054(),
    Run055(),
    Run056(),
    Run057(),
    Run058(),
    Run059(),
    Run060(),
    Run061(),
    Run062(),
    Run063(),
    Run064(),
    Run065(),
    Run066(),
    Run067(),
    Run068(),
    Run069(),
    Run070(),
    Run071(),
    Run072(),
    Run073(),
    Run074(),
    Run075(),
    Run076(),
    Run077(),
    Run078(),
    Run079(),
    Run080(),
    Run081(),
    Run082(),
    Run083(),
    Run084(),
    Run085(),
    Run086(),
    Run087(),
    Run088(),
    Run089(),
    Run090(),
    Run091(),
    Run092(),
    Run093(),
    Run094(),
    Run095(),
    Run096(),
    Run097(),
    Run098(),
    Run099(),
    Run100(),
    Run101(),
    Run102(),
    Run103(),
    Run104(),
    Run105(),
    Run106(),
    Run107(),
    Run108(),
    Run109(),
    Run110(),
    Run111(),
    Run112(),
    Run113(),
    Run114(),
    Run115(),
    Run116(),
    Run117(),
    Run118(),
    Run119(),
    Run120(),
    Run121(),
    Run122(),
    Run123(),
    Run124(),
    Run125(),
    Run126(),
    Run127(),
    Run128(),
    Run129(),
    Run130(),
    Run131(),
    Run132(),
    Run133(),
    Run134(),
    Run135(),
    Run136(),
    Run137(),
    Run138(),
    Run139(),
    Run140(),
    Run141(),
    Run142(),
    Run143(),
    Run144(),
    Run145(),
    Run146(),
    Run147(),
    Run148(),
    Run149(),
    Run150(),
    Run151(),
    Run152(),
    Run153(),
    Run154(),
    Run155(),
    Run156(),
    Run157(),
    Run158(),
    Run159(),
    Run160(),
    Run161(),
    Run162(),
    Run163(),
    Run164(),
    Run165(),
    Run166(),
    Run167(),
    Run168(),
    Run169(),
    Run170(),
    Run171(),
    Run172(),
    Run173(),
    Run174(),
    Run175(),
    Run176(),
    Run177(),
    Run178(),
    Run179(),
    Run180(),
    Run181(),
    Run182(),
    Run183(),
    Run184(),
    Run185(),
    Run186(),
    Run187(),
    Run188(),
    Run189(),
    Run190(),
    Run191(),
    Run192(),
    Run193(),
    Run194(),
    Run195(),
    Run196(),
    Run197(),
    Run198(),
    Run199(),
    Run200(),
  ],
}))
const TypePerformanceWorkerComposition =
  TypePerformanceWorkerDefinition.makeComposition()
const prepareWorker = () =>
  TypePerformanceWorkerComposition.prepareBlock({
    init: TypePerformanceWorkerComposition.makeInit(() => ({
      model: WorkerModel.make({ value: 0 }),
    })),
    update: TypePerformanceWorkerComposition.makeUpdate({
      RequestedRun: model => runAll(model),
      CompletedRun: model => ({ model }),
    }),
    operations: {
      runAll: WorkerMessage.RequestedRun,
    },
    EffectsLayer: Layer.mergeAll(
      Run001.layer,
      Run002.layer,
      Run003.layer,
      Run004.layer,
      Run005.layer,
      Run006.layer,
      Run007.layer,
      Run008.layer,
      Run009.layer,
      Run010.layer,
      Run011.layer,
      Run012.layer,
      Run013.layer,
      Run014.layer,
      Run015.layer,
      Run016.layer,
      Run017.layer,
      Run018.layer,
      Run019.layer,
      Run020.layer,
      Run021.layer,
      Run022.layer,
      Run023.layer,
      Run024.layer,
      Run025.layer,
      Run026.layer,
      Run027.layer,
      Run028.layer,
      Run029.layer,
      Run030.layer,
      Run031.layer,
      Run032.layer,
      Run033.layer,
      Run034.layer,
      Run035.layer,
      Run036.layer,
      Run037.layer,
      Run038.layer,
      Run039.layer,
      Run040.layer,
      Run041.layer,
      Run042.layer,
      Run043.layer,
      Run044.layer,
      Run045.layer,
      Run046.layer,
      Run047.layer,
      Run048.layer,
      Run049.layer,
      Run050.layer,
      Run051.layer,
      Run052.layer,
      Run053.layer,
      Run054.layer,
      Run055.layer,
      Run056.layer,
      Run057.layer,
      Run058.layer,
      Run059.layer,
      Run060.layer,
      Run061.layer,
      Run062.layer,
      Run063.layer,
      Run064.layer,
      Run065.layer,
      Run066.layer,
      Run067.layer,
      Run068.layer,
      Run069.layer,
      Run070.layer,
      Run071.layer,
      Run072.layer,
      Run073.layer,
      Run074.layer,
      Run075.layer,
      Run076.layer,
      Run077.layer,
      Run078.layer,
      Run079.layer,
      Run080.layer,
      Run081.layer,
      Run082.layer,
      Run083.layer,
      Run084.layer,
      Run085.layer,
      Run086.layer,
      Run087.layer,
      Run088.layer,
      Run089.layer,
      Run090.layer,
      Run091.layer,
      Run092.layer,
      Run093.layer,
      Run094.layer,
      Run095.layer,
      Run096.layer,
      Run097.layer,
      Run098.layer,
      Run099.layer,
      Run100.layer,
      Run101.layer,
      Run102.layer,
      Run103.layer,
      Run104.layer,
      Run105.layer,
      Run106.layer,
      Run107.layer,
      Run108.layer,
      Run109.layer,
      Run110.layer,
      Run111.layer,
      Run112.layer,
      Run113.layer,
      Run114.layer,
      Run115.layer,
      Run116.layer,
      Run117.layer,
      Run118.layer,
      Run119.layer,
      Run120.layer,
      Run121.layer,
      Run122.layer,
      Run123.layer,
      Run124.layer,
      Run125.layer,
      Run126.layer,
      Run127.layer,
      Run128.layer,
      Run129.layer,
      Run130.layer,
      Run131.layer,
      Run132.layer,
      Run133.layer,
      Run134.layer,
      Run135.layer,
      Run136.layer,
      Run137.layer,
      Run138.layer,
      Run139.layer,
      Run140.layer,
      Run141.layer,
      Run142.layer,
      Run143.layer,
      Run144.layer,
      Run145.layer,
      Run146.layer,
      Run147.layer,
      Run148.layer,
      Run149.layer,
      Run150.layer,
      Run151.layer,
      Run152.layer,
      Run153.layer,
      Run154.layer,
      Run155.layer,
      Run156.layer,
      Run157.layer,
      Run158.layer,
      Run159.layer,
      Run160.layer,
      Run161.layer,
      Run162.layer,
      Run163.layer,
      Run164.layer,
      Run165.layer,
      Run166.layer,
      Run167.layer,
      Run168.layer,
      Run169.layer,
      Run170.layer,
      Run171.layer,
      Run172.layer,
      Run173.layer,
      Run174.layer,
      Run175.layer,
      Run176.layer,
      Run177.layer,
      Run178.layer,
      Run179.layer,
      Run180.layer,
      Run181.layer,
      Run182.layer,
      Run183.layer,
      Run184.layer,
      Run185.layer,
      Run186.layer,
      Run187.layer,
      Run188.layer,
      Run189.layer,
      Run190.layer,
      Run191.layer,
      Run192.layer,
      Run193.layer,
      Run194.layer,
      Run195.layer,
      Run196.layer,
      Run197.layer,
      Run198.layer,
      Run199.layer,
      Run200.layer,
    ),
  })
const Worker: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof WorkerModel,
  typeof prepareWorker
> = Block.assemble(prepareWorker)
const ApplicationMessage = Schema.Never
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model: WorkerModel,
  Message: ApplicationMessage,
})
const WorkerBinding = ApplicationDefinition.makeBinding(Worker, {
  placement: 'worker',
  read: model => Option.some(model),
  write: (_model, nextWorker) => nextWorker,
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [WorkerBinding],
})
const update = ApplicationComposition.makeUpdate({})
const view = ApplicationComposition.makeView((_model, h) => h.main([]))

const prepareApplicationBlock = () =>
  ApplicationComposition.prepareBlock({
    init: ApplicationComposition.makeInit(() =>
      WorkerBinding.init({ args: [], toParentModel: model => model }),
    ),
    update,
    view,
    EffectsLayer: Layer.empty,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof WorkerModel,
  typeof prepareApplicationBlock
> = Block.assemble(prepareApplicationBlock)

export const program = Program.makeElement({
  block: ApplicationBlock,
  container: null,
})
export const providedProgram = program.provide(ClockLayer)

export type WorkerRequirements = Update.RequirementsOf<typeof runAll>
export type ApplicationRequirements = Update.RequirementsOf<typeof update>
export type Program = typeof program
type RequirementsOf<Value> =
  Value extends ElementProgram<
    undefined,
    infer Requirements,
    never,
    infer _ProvidedServices
  >
    ? Requirements
    : never
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type ProgramRequirementsAreClock = Expect<
  Equal<RequirementsOf<typeof program>, Clock>
>
type ProvidedRequirementsAreComplete = Expect<
  Equal<RequirementsOf<typeof providedProgram>, never>
>
export type Assertions = [
  ProgramRequirementsAreClock,
  ProvidedRequirementsAreComplete,
]
