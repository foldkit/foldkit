import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Result from 'effect/Result'

const gotWrapperPrefixPattern = /^Got[A-Z]/
const gotWrapperFullNamePattern = /^Got[A-Z][A-Za-z0-9]*Message$/
const allowedRoutingFieldPattern = /Id$/

interface GotWrapperCall {
  readonly tag: string
  readonly tagNode: ESTree.Node
  readonly callNode: ESTree.CallExpression
}

const isMCall = (call: ESTree.CallExpression): boolean =>
  call.callee.type === 'Identifier' && call.callee.name === 'm'

const stringLiteralArg = (arg: ESTree.Argument): Option.Option<string> =>
  arg.type === 'Literal' && P.isString(arg.value)
    ? Option.some(arg.value)
    : Option.none()

const gotWrapperCall = (
  call: ESTree.CallExpression,
): Option.Option<GotWrapperCall> =>
  isMCall(call)
    ? pipe(
        Option.fromNullishOr(call.arguments[0]),
        Option.flatMap(arg =>
          pipe(
            stringLiteralArg(arg),
            Option.filter(tag => gotWrapperPrefixPattern.test(tag)),
            Option.map(tag => ({
              tag,
              tagNode: arg,
              callNode: call,
            })),
          ),
        ),
      )
    : Option.none()

const propertyKeyName = (
  property: ESTree.ObjectProperty,
): Option.Option<string> => {
  if (property.computed) return Option.none()
  const key = property.key
  if (key.type === 'Identifier') return Option.some(key.name)
  return key.type === 'Literal' && P.isString(key.value)
    ? Option.some(key.value)
    : Option.none()
}

const objectArg = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.ObjectExpression> =>
  pipe(
    Option.fromNullishOr(call.arguments[1]),
    Option.filter(
      (arg): arg is ESTree.ObjectExpression => arg.type === 'ObjectExpression',
    ),
  )

const hasProperty = (object: ESTree.ObjectExpression, name: string): boolean =>
  pipe(
    object.properties,
    Arr.some(property =>
      property.type === 'Property'
        ? pipe(
            propertyKeyName(property),
            Option.match({
              onNone: () => false,
              onSome: key => key === name,
            }),
          )
        : false,
    ),
  )

interface ExtraField {
  readonly key: string
  readonly node: ESTree.Node
}

const extraFields = (
  object: ESTree.ObjectExpression,
): ReadonlyArray<ExtraField> =>
  pipe(
    object.properties,
    Arr.filterMap(property => {
      if (property.type !== 'Property') return Result.failVoid
      return pipe(
        propertyKeyName(property),
        Option.filter(
          key =>
            key !== 'message' &&
            key !== 'id' &&
            !allowedRoutingFieldPattern.test(key),
        ),
        Option.map(key => ({ key, node: property.key })),
        Result.fromOption(() => undefined),
      )
    }),
  )

const nameDiagnostic = (wrapper: GotWrapperCall) => {
  const base = Diagnostic.make({
    node: wrapper.tagNode,
    message: `Got-wrapper Message tag \`${wrapper.tag}\` must use the full \`Got*Message\` name so DevTools can identify submodel wrappers. Rename it to \`${wrapper.tag}Message\` when it is a wrapper. (FK messages)`,
  })
  return wrapper.tag.endsWith('Message')
    ? base
    : Diagnostic.withSuggestions(base, [
        {
          desc: `Rename to ${wrapper.tag}Message`,
          fix: Diagnostic.replaceText(
            wrapper.tagNode,
            `'${wrapper.tag}Message'`,
          ),
        },
      ])
}

const analyzeWrapper = (
  ctx: RuleContext['Service'],
  wrapper: GotWrapperCall,
): Effect.Effect<void, never, RuleContext> => {
  const nameCheck = gotWrapperFullNamePattern.test(wrapper.tag)
    ? Effect.void
    : ctx.report(nameDiagnostic(wrapper))

  const fieldsArg = Option.fromNullishOr(wrapper.callNode.arguments[1])
  const missingFields = Option.isNone(fieldsArg)
    ? ctx.report(
        Diagnostic.make({
          node: wrapper.callNode,
          message: `Got-wrapper \`${wrapper.tag}\` must declare fields with at least a \`message\` property. Wrappers carry child output plus routing context only. (FK messages)`,
        }),
      )
    : Effect.void

  const fieldsCheck = pipe(
    objectArg(wrapper.callNode),
    Option.match({
      onNone: () => Effect.void,
      onSome: fields =>
        Effect.all(
          [
            hasProperty(fields, 'message')
              ? Effect.void
              : ctx.report(
                  Diagnostic.make({
                    node: fields,
                    message: `Got-wrapper \`${wrapper.tag}\` must include a \`message\` property for the child Message it wraps. (FK messages)`,
                  }),
                ),
            Effect.forEach(
              extraFields(fields),
              field =>
                ctx.report(
                  Diagnostic.make({
                    node: field.node,
                    message: `Got-wrapper \`${wrapper.tag}\` has extra field \`${field.key}\`. Wrappers may carry only \`message\`, \`id\`, or routing keys ending in \`Id\`. (FK messages)`,
                  }),
                ),
              { concurrency: 1, discard: true },
            ),
          ],
          { concurrency: 1, discard: true },
        ),
    }),
  )

  return Effect.all([nameCheck, missingFields, fieldsCheck], {
    concurrency: 1,
    discard: true,
  })
}

const rule: CreateRule = Rule.define({
  name: 'got-wrapper-carries-only-routing',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Got-wrapper Messages must be named `Got*Message` and carry only `{ message, id?, *Id? }` routing context',
    hasSuggestions: true,
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node =>
      pipe(
        gotWrapperCall(node),
        Option.match({
          onNone: () => Effect.void,
          onSome: wrapper => analyzeWrapper(ctx, wrapper),
        }),
      ),
    )
  },
})

export default rule
