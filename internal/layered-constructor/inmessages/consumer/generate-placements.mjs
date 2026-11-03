import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const read = file => readFileSync(resolve(root, 'src/chatRoom', file), 'utf8')
const after = (source, marker) => {
  assert(source.includes(marker), marker)
  return source.slice(source.indexOf(marker) + marker.length).trim()
}
const composition = read('composition.ts')
const binding = after(
  composition,
  'export const MessageComposerBinding = ',
).split('\n\nexport const ChatRoomComposition')[0]
const update = after(read('update.ts'), 'export const update = ')
const inMessageUpdate = after(
  read('inMessageUpdate.ts'),
  'export const inMessageUpdate = ',
)
const init = after(read('init.ts'), 'export const init = ')
const steps = after(read('steps.ts'), 'export const recordSentMessage = ')
const viewSource = read('view.ts')
const view = after(viewSource, 'export const view = ')
const messagesView = `const messagesView${after(viewSource, 'const messagesView').split('\n\nexport const view')[0]}`

const imports = `import { Array, DateTime, Effect } from 'effect'
import { Update } from 'foldkit'
import type { Html } from 'foldkit/html'
import { MessageComposerContract } from './messageComposer/definition'
import { SendMessage, TimestampReceivedMessage } from './chatRoom/command'
import { TimestampSentMessage } from './chatRoom/command'
import { disconnect } from './chatRoom/steps'
import type { ChatRoomViewBuilder } from './chatRoom/composition'
import { makeBinding, makeBlock, makeComposition, makeOutMessageFold, makeCommandsStep, makeFieldsStep, makeNoopStep, makeStep } from './chatRoom/definition'
import { EffectsLayer } from './chatRoom/layer'
import { managedResources } from './chatRoom/managedResource'
import { Message } from './chatRoom/message'
import { ChatMessage, ConnectionState } from './chatRoom/model'
import { subscriptions } from './chatRoom/subscription'
`

const local = `export const LocalChatRoomBlock = makeBlock(Effect.gen(function* () {
  const MessageComposerBinding = ${binding}
  const ChatRoomComposition = makeComposition({ bindings: [MessageComposerBinding] })
  const messageComposer = yield* MessageComposerBinding
  const recordSentMessage = ${steps}
  const init = ${init}
  const update = ${update}
  const inMessageUpdate = ${inMessageUpdate}
  const view = ${view}
  return { children: [messageComposer], init, update, inMessageUpdate, view, subscriptions, managedResources, EffectsLayer }
}))
`

const inline = `export const InlineChatRoomBlock = makeBlock(Effect.gen(function* () {
  const ChatRoomComposition = makeComposition({ bindings: [${binding}] })
  const MessageComposerBinding = Array.headNonEmpty(ChatRoomComposition.bindings)
  const recordSentMessage = ${steps}
  return {
    children: [yield* MessageComposerBinding],
    init: ${init},
    update: ${update},
    inMessageUpdate: ${inMessageUpdate},
    view: ${view},
    subscriptions,
    managedResources,
    EffectsLayer,
  }
}))
`

writeFileSync(
  resolve(root, 'src/placements.ts'),
  `${imports}\n${messagesView}\n\n${local}\n${inline}`,
)
writeFileSync(
  resolve(root, 'placement-expressions.json'),
  `${JSON.stringify(
    {
      sourceFiles: [
        'src/chatRoom/composition.ts',
        'src/chatRoom/update.ts',
        'src/chatRoom/inMessageUpdate.ts',
        'src/chatRoom/init.ts',
        'src/chatRoom/view.ts',
        'src/chatRoom/steps.ts',
        'src/messageComposer/inMessageUpdate.ts',
        'src/messageComposer/steps.ts',
      ],
      generated: 'src/placements.ts',
      completeBindingExpressionCopiedExactly: true,
      completeUpdateExpressionCopiedExactly: true,
      completeReceiveExpressionCopiedExactly: true,
      composerInMessageUpdatePlacements: 'src/composerPlacements.ts',
      localInitAndViewAlsoCopied: true,
      inlineBindingConnection:
        'Reuses Array.headNonEmpty(Composition.bindings), never creates a second relationship.',
      relatedStep:
        'Constructor-local copies close over the same local Binding. The real extracted Step remains in chatRoom/steps.ts.',
    },
    null,
    2,
  )}\n`,
)
console.log(
  'Generated local/inline proofs from the exact extracted Binding and update builder expressions.',
)

const composerInMessageUpdate = after(
  readFileSync(resolve(root, 'src/messageComposer/inMessageUpdate.ts'), 'utf8'),
  'export const inMessageUpdate = ',
)
const composerImports = `import { Effect } from 'effect'
import { MessageComposerComposition } from './messageComposer/composition'
import { MessageComposerDefinition, makeFieldsStep } from './messageComposer/definition'
import { init } from './messageComposer/init'
import { FocusInput } from './messageComposer/mount'
import { submitMessage } from './messageComposer/steps'
import { update } from './messageComposer/update'
import { view } from './messageComposer/view'
`
const localComposer = `export const LocalMessageComposerBlock = MessageComposerDefinition.makeBlock(
  Effect.gen(function* () {
    const inMessageUpdate = ${composerInMessageUpdate}
    return { children: [], init, update, inMessageUpdate, view, EffectsLayer: FocusInput.layer }
  }),
)
`
const inlineComposer = `export const InlineMessageComposerBlock = MessageComposerDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update, inMessageUpdate: ${composerInMessageUpdate}, view, EffectsLayer: FocusInput.layer }
  }),
)
`
writeFileSync(
  resolve(root, 'src/composerPlacements.ts'),
  `${composerImports}\n${localComposer}\n${inlineComposer}`,
)
