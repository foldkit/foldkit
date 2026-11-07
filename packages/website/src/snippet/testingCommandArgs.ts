import { Schema } from 'effect'
import { Story } from 'foldkit'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedPaint: { generation: Schema.Number },
})
type Message = typeof Message.Type

const Paint = Command.define('Paint', {
  args: { generation: Schema.Number },
  messages: [Message.CompletedPaint],
})

const paint = Paint({ generation: 4 })

// Custom testing tools can project typed arguments from an invocation they own.
export const maybePaintArgs = Story.Command.argsOf(Paint)(paint)

// An ordinary Story asserts and resolves the expected invocation directly.
export const completedPaint = Story.steps(
  Story.Command.expectExact(paint),
  Story.Command.resolve(paint, Message.CompletedPaint({ generation: 4 })),
)
