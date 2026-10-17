import { Context, Effect, Layer, Option, Schema } from 'effect'
import { defineApplication } from 'foldkit'
import type { Element as ElementProgram } from 'foldkit/application'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import type * as Update from 'foldkit/update'

const WarmupModel = Schema.Struct({ value: Schema.Number })
const WarmupMessage = defineMessageUnion({ CompletedWarmup: {} })

// oxlint-disable-next-line effecttsgo/floating-effect
Effect.void
Layer.empty
Option.none()
defineApplication({ Model: WarmupModel, Message: WarmupMessage })
Context.Service
Block.define('TypePerformanceWarmup', {
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

const TypePerformanceWorker = Block.define('TypePerformanceWorker', {
  Model: WorkerModel,
  Message: WorkerMessage,
})

const Run001 = TypePerformanceWorker.command('Run001', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run002 = TypePerformanceWorker.command('Run002', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run003 = TypePerformanceWorker.command('Run003', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run004 = TypePerformanceWorker.command('Run004', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run005 = TypePerformanceWorker.command('Run005', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run006 = TypePerformanceWorker.command('Run006', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run007 = TypePerformanceWorker.command('Run007', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run008 = TypePerformanceWorker.command('Run008', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run009 = TypePerformanceWorker.command('Run009', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run010 = TypePerformanceWorker.command('Run010', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run011 = TypePerformanceWorker.command('Run011', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run012 = TypePerformanceWorker.command('Run012', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run013 = TypePerformanceWorker.command('Run013', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run014 = TypePerformanceWorker.command('Run014', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run015 = TypePerformanceWorker.command('Run015', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run016 = TypePerformanceWorker.command('Run016', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run017 = TypePerformanceWorker.command('Run017', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run018 = TypePerformanceWorker.command('Run018', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run019 = TypePerformanceWorker.command('Run019', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run020 = TypePerformanceWorker.command('Run020', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run021 = TypePerformanceWorker.command('Run021', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run022 = TypePerformanceWorker.command('Run022', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run023 = TypePerformanceWorker.command('Run023', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run024 = TypePerformanceWorker.command('Run024', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run025 = TypePerformanceWorker.command('Run025', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run026 = TypePerformanceWorker.command('Run026', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run027 = TypePerformanceWorker.command('Run027', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run028 = TypePerformanceWorker.command('Run028', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run029 = TypePerformanceWorker.command('Run029', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run030 = TypePerformanceWorker.command('Run030', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run031 = TypePerformanceWorker.command('Run031', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run032 = TypePerformanceWorker.command('Run032', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run033 = TypePerformanceWorker.command('Run033', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run034 = TypePerformanceWorker.command('Run034', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run035 = TypePerformanceWorker.command('Run035', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run036 = TypePerformanceWorker.command('Run036', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run037 = TypePerformanceWorker.command('Run037', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run038 = TypePerformanceWorker.command('Run038', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run039 = TypePerformanceWorker.command('Run039', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run040 = TypePerformanceWorker.command('Run040', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run041 = TypePerformanceWorker.command('Run041', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run042 = TypePerformanceWorker.command('Run042', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run043 = TypePerformanceWorker.command('Run043', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run044 = TypePerformanceWorker.command('Run044', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run045 = TypePerformanceWorker.command('Run045', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run046 = TypePerformanceWorker.command('Run046', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run047 = TypePerformanceWorker.command('Run047', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run048 = TypePerformanceWorker.command('Run048', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run049 = TypePerformanceWorker.command('Run049', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run050 = TypePerformanceWorker.command('Run050', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run051 = TypePerformanceWorker.command('Run051', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run052 = TypePerformanceWorker.command('Run052', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run053 = TypePerformanceWorker.command('Run053', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run054 = TypePerformanceWorker.command('Run054', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run055 = TypePerformanceWorker.command('Run055', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run056 = TypePerformanceWorker.command('Run056', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run057 = TypePerformanceWorker.command('Run057', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run058 = TypePerformanceWorker.command('Run058', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run059 = TypePerformanceWorker.command('Run059', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run060 = TypePerformanceWorker.command('Run060', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run061 = TypePerformanceWorker.command('Run061', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run062 = TypePerformanceWorker.command('Run062', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run063 = TypePerformanceWorker.command('Run063', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run064 = TypePerformanceWorker.command('Run064', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run065 = TypePerformanceWorker.command('Run065', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run066 = TypePerformanceWorker.command('Run066', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run067 = TypePerformanceWorker.command('Run067', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run068 = TypePerformanceWorker.command('Run068', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run069 = TypePerformanceWorker.command('Run069', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run070 = TypePerformanceWorker.command('Run070', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run071 = TypePerformanceWorker.command('Run071', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run072 = TypePerformanceWorker.command('Run072', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run073 = TypePerformanceWorker.command('Run073', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run074 = TypePerformanceWorker.command('Run074', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run075 = TypePerformanceWorker.command('Run075', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run076 = TypePerformanceWorker.command('Run076', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run077 = TypePerformanceWorker.command('Run077', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run078 = TypePerformanceWorker.command('Run078', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run079 = TypePerformanceWorker.command('Run079', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run080 = TypePerformanceWorker.command('Run080', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run081 = TypePerformanceWorker.command('Run081', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run082 = TypePerformanceWorker.command('Run082', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run083 = TypePerformanceWorker.command('Run083', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run084 = TypePerformanceWorker.command('Run084', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run085 = TypePerformanceWorker.command('Run085', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run086 = TypePerformanceWorker.command('Run086', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run087 = TypePerformanceWorker.command('Run087', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run088 = TypePerformanceWorker.command('Run088', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run089 = TypePerformanceWorker.command('Run089', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run090 = TypePerformanceWorker.command('Run090', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run091 = TypePerformanceWorker.command('Run091', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run092 = TypePerformanceWorker.command('Run092', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run093 = TypePerformanceWorker.command('Run093', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run094 = TypePerformanceWorker.command('Run094', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run095 = TypePerformanceWorker.command('Run095', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run096 = TypePerformanceWorker.command('Run096', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run097 = TypePerformanceWorker.command('Run097', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run098 = TypePerformanceWorker.command('Run098', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run099 = TypePerformanceWorker.command('Run099', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run100 = TypePerformanceWorker.command('Run100', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run101 = TypePerformanceWorker.command('Run101', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run102 = TypePerformanceWorker.command('Run102', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run103 = TypePerformanceWorker.command('Run103', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run104 = TypePerformanceWorker.command('Run104', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run105 = TypePerformanceWorker.command('Run105', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run106 = TypePerformanceWorker.command('Run106', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run107 = TypePerformanceWorker.command('Run107', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run108 = TypePerformanceWorker.command('Run108', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run109 = TypePerformanceWorker.command('Run109', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run110 = TypePerformanceWorker.command('Run110', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run111 = TypePerformanceWorker.command('Run111', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run112 = TypePerformanceWorker.command('Run112', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run113 = TypePerformanceWorker.command('Run113', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run114 = TypePerformanceWorker.command('Run114', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run115 = TypePerformanceWorker.command('Run115', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run116 = TypePerformanceWorker.command('Run116', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run117 = TypePerformanceWorker.command('Run117', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run118 = TypePerformanceWorker.command('Run118', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run119 = TypePerformanceWorker.command('Run119', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run120 = TypePerformanceWorker.command('Run120', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run121 = TypePerformanceWorker.command('Run121', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run122 = TypePerformanceWorker.command('Run122', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run123 = TypePerformanceWorker.command('Run123', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run124 = TypePerformanceWorker.command('Run124', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run125 = TypePerformanceWorker.command('Run125', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run126 = TypePerformanceWorker.command('Run126', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run127 = TypePerformanceWorker.command('Run127', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run128 = TypePerformanceWorker.command('Run128', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run129 = TypePerformanceWorker.command('Run129', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run130 = TypePerformanceWorker.command('Run130', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run131 = TypePerformanceWorker.command('Run131', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run132 = TypePerformanceWorker.command('Run132', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run133 = TypePerformanceWorker.command('Run133', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run134 = TypePerformanceWorker.command('Run134', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run135 = TypePerformanceWorker.command('Run135', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run136 = TypePerformanceWorker.command('Run136', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run137 = TypePerformanceWorker.command('Run137', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run138 = TypePerformanceWorker.command('Run138', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run139 = TypePerformanceWorker.command('Run139', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run140 = TypePerformanceWorker.command('Run140', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run141 = TypePerformanceWorker.command('Run141', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run142 = TypePerformanceWorker.command('Run142', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run143 = TypePerformanceWorker.command('Run143', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run144 = TypePerformanceWorker.command('Run144', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run145 = TypePerformanceWorker.command('Run145', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run146 = TypePerformanceWorker.command('Run146', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run147 = TypePerformanceWorker.command('Run147', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run148 = TypePerformanceWorker.command('Run148', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run149 = TypePerformanceWorker.command('Run149', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run150 = TypePerformanceWorker.command('Run150', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run151 = TypePerformanceWorker.command('Run151', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run152 = TypePerformanceWorker.command('Run152', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run153 = TypePerformanceWorker.command('Run153', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run154 = TypePerformanceWorker.command('Run154', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run155 = TypePerformanceWorker.command('Run155', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run156 = TypePerformanceWorker.command('Run156', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run157 = TypePerformanceWorker.command('Run157', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run158 = TypePerformanceWorker.command('Run158', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run159 = TypePerformanceWorker.command('Run159', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run160 = TypePerformanceWorker.command('Run160', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run161 = TypePerformanceWorker.command('Run161', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run162 = TypePerformanceWorker.command('Run162', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run163 = TypePerformanceWorker.command('Run163', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run164 = TypePerformanceWorker.command('Run164', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run165 = TypePerformanceWorker.command('Run165', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run166 = TypePerformanceWorker.command('Run166', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run167 = TypePerformanceWorker.command('Run167', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run168 = TypePerformanceWorker.command('Run168', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run169 = TypePerformanceWorker.command('Run169', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run170 = TypePerformanceWorker.command('Run170', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run171 = TypePerformanceWorker.command('Run171', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run172 = TypePerformanceWorker.command('Run172', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run173 = TypePerformanceWorker.command('Run173', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run174 = TypePerformanceWorker.command('Run174', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run175 = TypePerformanceWorker.command('Run175', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run176 = TypePerformanceWorker.command('Run176', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run177 = TypePerformanceWorker.command('Run177', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run178 = TypePerformanceWorker.command('Run178', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run179 = TypePerformanceWorker.command('Run179', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run180 = TypePerformanceWorker.command('Run180', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run181 = TypePerformanceWorker.command('Run181', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run182 = TypePerformanceWorker.command('Run182', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run183 = TypePerformanceWorker.command('Run183', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run184 = TypePerformanceWorker.command('Run184', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run185 = TypePerformanceWorker.command('Run185', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run186 = TypePerformanceWorker.command('Run186', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run187 = TypePerformanceWorker.command('Run187', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run188 = TypePerformanceWorker.command('Run188', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run189 = TypePerformanceWorker.command('Run189', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run190 = TypePerformanceWorker.command('Run190', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run191 = TypePerformanceWorker.command('Run191', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run192 = TypePerformanceWorker.command('Run192', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run193 = TypePerformanceWorker.command('Run193', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run194 = TypePerformanceWorker.command('Run194', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run195 = TypePerformanceWorker.command('Run195', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run196 = TypePerformanceWorker.command('Run196', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run197 = TypePerformanceWorker.command('Run197', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run198 = TypePerformanceWorker.command('Run198', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run199 = TypePerformanceWorker.command('Run199', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const Run200 = TypePerformanceWorker.command('Run200', {
  messages: [WorkerMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(WorkerMessage.CompletedRun()))
  },
})

const runAll = TypePerformanceWorker.step(model => ({
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
const TypePerformanceWorkerComposition = TypePerformanceWorker.makeComposition()
const Worker = TypePerformanceWorkerComposition.makeBlock({
  init: TypePerformanceWorkerComposition.makeInit(() => ({
    model: WorkerModel.make({ value: 0 }),
  })),
  update: TypePerformanceWorkerComposition.makeUpdate((model, message) =>
    WorkerMessage.match(message, {
      RequestedRun: () => runAll(model),
      CompletedRun: () => ({ model }),
    }),
  ),
  expose: { runAll },
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
const Application = defineApplication({
  Model: WorkerModel,
  Message: WorkerMessage,
})
const WorkerBinding = Application.bindChild(Worker, {
  placement: 'worker',
  read: model => Option.some(model),
  write: (_model, nextWorker) => nextWorker,
  toParentMessage: message => message,
  fromParentMessage: false,
})
const ApplicationComposition = Application.makeComposition({
  childBindings: [WorkerBinding],
})
const update = ApplicationComposition.makeUpdate((model, message) =>
  WorkerBinding.fold(model, message),
)
const view = ApplicationComposition.makeView((_model, h) => h.main([]))

export const program = ApplicationComposition.makeElement({
  container: null,
  init: ApplicationComposition.makeInit(() =>
    WorkerBinding.init({ args: [], toParentModel: model => model }),
  ),
  update,
  view,
  EffectsLayer: Layer.empty,
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
