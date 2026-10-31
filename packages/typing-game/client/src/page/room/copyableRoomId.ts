import { Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { type Html, inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const COPIED_INDICATOR_DURATION = '2 seconds'

const Model = Schema.Struct({
  isCopiedIndicatorVisible: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedCopyRoomId: {},
  SucceededCopyRoomId: {},
  FailedCopyRoomId: {},
  CompletedWaitBeforeHidingRoomIdCopiedIndicator: {},
})

export const CopyRoomId = Command.define('CopyRoomId', {
  args: { roomId: Schema.String },
  messages: [Message.SucceededCopyRoomId, Message.FailedCopyRoomId],
})

export const WaitBeforeHidingRoomIdCopiedIndicator = Command.define(
  'WaitBeforeHidingRoomIdCopiedIndicator',
  { messages: [Message.CompletedWaitBeforeHidingRoomIdCopiedIndicator] },
)

export type CopyableRoomIdArgs = Readonly<{ roomId: string }>

export class CopyableRoomId extends Block<CopyableRoomId, CopyableRoomIdArgs>()(
  'CopyableRoomId',
  {
    Model,
    Message,
    Command: [CopyRoomId, WaitBeforeHidingRoomIdCopiedIndicator],
  },
) {}

export const CopyableRoomIdLive = CopyableRoomId.make(
  Effect.fn(function* (_id, { roomId }) {
    return {
      model: { isCopiedIndicatorVisible: false },

      update: {
        ClickedCopyRoomId: model => ({
          model,
          commands: [CopyRoomId({ roomId })],
        }),
        SucceededCopyRoomId: model => {
          if (model.isCopiedIndicatorVisible) {
            return { model }
          } else {
            return {
              model: modifyFields(model, {
                isCopiedIndicatorVisible: () => true,
              }),
              commands: [WaitBeforeHidingRoomIdCopiedIndicator()],
            }
          }
        },
        FailedCopyRoomId: model => ({ model }),
        CompletedWaitBeforeHidingRoomIdCopiedIndicator: model => ({
          model: modifyFields(model, {
            isCopiedIndicatorVisible: () => false,
          }),
        }),
      },

      commands: {
        CopyRoomId: ({ roomId }) =>
          Effect.tryPromise(() => navigator.clipboard.writeText(roomId)).pipe(
            Effect.as(Message.SucceededCopyRoomId()),
            Effect.catch(() => Effect.succeed(Message.FailedCopyRoomId())),
          ),
        WaitBeforeHidingRoomIdCopiedIndicator: () =>
          Effect.sleep(COPIED_INDICATOR_DURATION).pipe(
            Effect.as(Message.CompletedWaitBeforeHidingRoomIdCopiedIndicator()),
          ),
      },

      view: (model, h) =>
        h.div(
          [h.Class('mb-12 flex items-center gap-2')],
          [
            h.span([], [roomId]),
            h.button(
              [
                h.Class(
                  'p-2 rounded hover:bg-terminal-green-dim hover:text-terminal-bg transition text-terminal-green',
                ),
                h.AriaLabel('Copy room ID'),
                h.OnClick(Message.ClickedCopyRoomId()),
              ],
              [copyIcon],
            ),
            model.isCopiedIndicatorVisible
              ? h.div(
                  [
                    h.Class(
                      'text-lg rounded py-1 px-2 font-medium bg-terminal-green-dim text-terminal-bg uppercase',
                    ),
                  ],
                  ['Copied'],
                )
              : h.empty,
          ],
        ),
    }
  }),
)

const copyIcon: Html = ih.svg(
  [
    ih.Class('w-5 h-5'),
    ih.Xmlns('http://www.w3.org/2000/svg'),
    ih.Fill('none'),
    ih.ViewBox('0 0 24 24'),
    ih.StrokeWidth('1.5'),
    ih.Stroke('currentColor'),
  ],
  [
    ih.path([
      ih.StrokeLinecap('round'),
      ih.StrokeLinejoin('round'),
      ih.D(
        'M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184',
      ),
    ]),
  ],
)
