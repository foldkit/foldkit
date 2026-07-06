import { Array, Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  calleeMatchesHelperName,
  isCallExpression,
  isIdentifier,
  isObjectExpression,
  isStringLiteral,
  staticStringValue,
} from '../guards.ts'

// Standard DOM event handler content-attribute names. Matching a known set
// instead of an `on\w+` pattern keeps ordinary `on`-prefixed names like
// `online` from being read as event handlers.
const domEventHandlerNames: ReadonlySet<string> = new Set([
  // Mouse and pointer
  'onclick',
  'ondblclick',
  'onauxclick',
  'oncontextmenu',
  'onmousedown',
  'onmouseup',
  'onmouseenter',
  'onmouseleave',
  'onmouseover',
  'onmouseout',
  'onmousemove',
  'onwheel',
  'onpointerdown',
  'onpointerup',
  'onpointermove',
  'onpointerenter',
  'onpointerleave',
  'onpointerover',
  'onpointerout',
  'onpointercancel',
  'ongotpointercapture',
  'onlostpointercapture',
  // Touch
  'ontouchstart',
  'ontouchend',
  'ontouchmove',
  'ontouchcancel',
  // Keyboard
  'onkeydown',
  'onkeyup',
  'onkeypress',
  // Focus
  'onfocus',
  'onblur',
  'onfocusin',
  'onfocusout',
  // Form and input
  'oninput',
  'onbeforeinput',
  'onchange',
  'onsubmit',
  'onreset',
  'oninvalid',
  'onselect',
  'onformdata',
  // Clipboard
  'oncopy',
  'oncut',
  'onpaste',
  // Drag and drop
  'ondrag',
  'ondragstart',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondrop',
  // Media
  'onplay',
  'onplaying',
  'onpause',
  'onended',
  'onvolumechange',
  'ontimeupdate',
  'ondurationchange',
  'onratechange',
  'onseeked',
  'onseeking',
  'onstalled',
  'onsuspend',
  'onwaiting',
  'oncanplay',
  'oncanplaythrough',
  'onloadeddata',
  'onloadedmetadata',
  'onloadstart',
  'onprogress',
  'onemptied',
  // Animation and transition
  'onanimationstart',
  'onanimationend',
  'onanimationiteration',
  'onanimationcancel',
  'ontransitionrun',
  'ontransitionstart',
  'ontransitionend',
  'ontransitioncancel',
  // Element and document
  'onload',
  'onerror',
  'onabort',
  'onscroll',
  'onscrollend',
  'onresize',
  'ontoggle',
  'oncancel',
  'onclose',
  'oncuechange',
  // Window
  'onbeforeunload',
  'onunload',
  'onhashchange',
  'onpopstate',
  'onpagehide',
  'onpageshow',
  'ononline',
  'onoffline',
  'onmessage',
  'onmessageerror',
  'onstorage',
  'onrejectionhandled',
  'onunhandledrejection',
  'onafterprint',
  'onbeforeprint',
])

// GUARDS

const isRawEventName = (attributeName: string): boolean =>
  domEventHandlerNames.has(attributeName.toLowerCase())

const isKeyPropertyKey = (key: unknown): boolean =>
  isIdentifier(key, 'key') || (isStringLiteral(key) && key.value === 'key')

const isKeyProperty = (
  property: ESTree.ObjectProperty | ESTree.SpreadElement,
): property is ESTree.ObjectProperty =>
  property.type === 'Property' &&
  !property.computed &&
  isKeyPropertyKey(property.key)

const keyPropertyValue = (
  configObject: ESTree.ObjectExpression,
): Option.Option<ESTree.Expression> =>
  Option.map(
    Array.findFirst(configObject.properties, isKeyProperty),
    property => property.value,
  )

const attributeEventName = (
  node: ESTree.CallExpression,
): Option.Option<string> => {
  if (!calleeMatchesHelperName(node.callee, 'Attribute')) {
    return Option.none()
  }
  const [firstArgument] = node.arguments
  return Option.filter(staticStringValue(firstArgument), isRawEventName)
}

const propEventName = (node: ESTree.CallExpression): Option.Option<string> => {
  if (!calleeMatchesHelperName(node.callee, 'Prop')) {
    return Option.none()
  }
  const [configArgument] = node.arguments
  if (!isObjectExpression(configArgument)) {
    return Option.none()
  }
  return pipe(
    keyPropertyValue(configArgument),
    Option.flatMap(staticStringValue),
    Option.filter(isRawEventName),
  )
}

// RULE

/**
 * Disallows constructing raw DOM event attributes (onclick, oninput, and the
 * rest) through the Attribute and Prop escape hatches. Events must flow
 * through the typed On* attribute constructors so every interaction
 * dispatches a Message through update.
 */
export const noRawDomEventAttributes = Rule.define({
  name: 'no-raw-dom-event-attributes',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Dispatch events through typed On* attribute constructors instead of raw on* DOM attributes.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        return pipe(
          attributeEventName(node),
          Option.orElse(() => propEventName(node)),
          Option.match({
            onNone: () => Effect.void,
            onSome: attributeName =>
              ctx.report(
                Diagnostic.make({
                  node,
                  message: `Raw DOM event attribute \`${attributeName}\` bypasses the Foldkit runtime: nothing it does flows through update as a Message. Use the typed \`On*\` attribute constructors instead, for example \`OnClick(SomeMessage())\`. If this is a crash view rendered outside the dispatch loop, suppress this rule with a disable comment.`,
                }),
              ),
          }),
        )
      },
    }
  },
})
