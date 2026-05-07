import { doc } from 'prettier'
import type { AstPath, Doc, ParserOptions } from 'prettier'

import {
  type AttachedComment,
  calleeName,
  hasType,
  readArrayField,
  readCommentsField,
} from './types.js'

const { align, group, hardlineWithoutBreakParent, ifBreak } = doc.builders

type PrintFn = (path: AstPath) => Doc

interface BaseInput {
  readonly path: AstPath
  readonly options: ParserOptions
  readonly print: PrintFn
  readonly fallback: () => Doc
}

interface CallInput extends BaseInput {
  readonly callScope: 'all' | 'allowlist'
  readonly allowlist: ReadonlySet<string>
}

const hasDanglingComment = (
  comments: ReadonlyArray<AttachedComment>,
): boolean => comments.some(c => c.leading !== true && c.trailing !== true)

const childrenHaveLeadingOwnLineComment = (
  comments: ReadonlyArray<ReadonlyArray<AttachedComment>>,
): boolean =>
  comments.some(cs =>
    cs.some(c => c.leading === true && c.placement === 'ownLine'),
  )

const collectChildren = (
  values: ReadonlyArray<unknown>,
): {
  readonly children: ReadonlyArray<Readonly<Record<string, unknown>> | null>
  readonly hasNullHole: boolean
} => {
  const children: Array<Readonly<Record<string, unknown>> | null> = []
  let hasNullHole = false
  for (const v of values) {
    if (v === null) {
      children.push(null)
      hasNullHole = true
      continue
    }
    if (!hasType(v)) {
      children.push(null)
      hasNullHole = true
      continue
    }
    children.push(v)
  }
  return { children, hasNullHole }
}

const childCommentMatrix = (
  children: ReadonlyArray<Readonly<Record<string, unknown>> | null>,
): ReadonlyArray<ReadonlyArray<AttachedComment>> =>
  children.map(c => readCommentsField(c))

const isHuggableCall = (
  callee: unknown,
  scope: 'all' | 'allowlist',
  allowlist: ReadonlySet<string>,
): boolean => {
  if (scope === 'all') {
    return true
  }
  const name = calleeName(callee)
  return name !== null && allowlist.has(name)
}

const containsTag = (
  values: ReadonlyArray<Readonly<Record<string, unknown>> | null>,
  tag: string,
): boolean => values.some(v => v !== null && hasType(v) && v.type === tag)

/**
 * Cases where Prettier wraps an ObjectExpression in parentheses to keep the
 * source unambiguous. Replicating that wrapping in our printer is fiddly, so
 * we fall back to the original printer when one of these contexts is detected.
 */
const objectNeedsParens = (path: AstPath): boolean => {
  const parent = path.parent
  if (!hasType(parent)) {
    return false
  }
  if (parent.type === 'ArrowFunctionExpression' && path.key === 'body') {
    return true
  }
  if (parent.type === 'ExpressionStatement' && path.key === 'expression') {
    return true
  }
  return false
}

/**
 * `new (foo())()` — the call needs parens around it. Rare but worth handling
 * to avoid producing invalid TypeScript.
 */
const callNeedsParens = (path: AstPath): boolean => {
  const parent = path.parent
  if (!hasType(parent)) {
    return false
  }
  return parent.type === 'NewExpression' && path.key === 'callee'
}

/**
 * Emit a hugged, leading-comma layout. Flat: `open child1, child2, child3 close`.
 * Broken:
 *
 *     open child1
 *     , child2
 *     , child3
 *     close
 *
 * The closing delimiter aligns with the opening delimiter's column. Children
 * are aligned two columns past the opener, matching the visual `open ` prefix.
 *
 * `flatInnerSpace` controls whether the flat form has a single space inside
 * the brackets — `{ a: 1 }` for objects, `[a, b, c]` and `foo(a, b)` without.
 */
const printHuggedSiblings = (
  open: string,
  close: string,
  childDocs: ReadonlyArray<Doc>,
  flatInnerSpace: boolean,
): Doc => {
  if (childDocs.length === 0) {
    return [open, close]
  }

  const sep: Doc = ifBreak([hardlineWithoutBreakParent, ', '], ', ')
  const huggedChild = (d: Doc): Doc => align(2, d)
  const flatSpace = flatInnerSpace ? ' ' : ''

  const first = childDocs[0]
  if (first === undefined) {
    return [open, close]
  }
  const parts: Doc[] = [open, ifBreak(' ', flatSpace), huggedChild(first)]
  for (let i = 1; i < childDocs.length; i += 1) {
    const next = childDocs[i]
    if (next === undefined) {
      continue
    }
    parts.push(sep, huggedChild(next))
  }
  parts.push(ifBreak(hardlineWithoutBreakParent, flatSpace), close)

  return group(parts)
}

export const printArrayHugged = ({
  path,
  options: _options,
  print,
  fallback,
}: BaseInput): Doc => {
  const node = path.node
  if (!hasType(node)) {
    return fallback()
  }
  const elements = readArrayField(node, 'elements')

  if (elements.length === 0) {
    return fallback()
  }
  const { children, hasNullHole } = collectChildren(elements)
  if (hasNullHole) {
    return fallback()
  }
  if (hasDanglingComment(readCommentsField(node))) {
    return fallback()
  }
  if (childrenHaveLeadingOwnLineComment(childCommentMatrix(children))) {
    return fallback()
  }

  const childDocs: Doc[] = []
  path.each((childPath: AstPath) => {
    childDocs.push(print(childPath))
  }, 'elements')

  return printHuggedSiblings('[', ']', childDocs, false)
}

export const printCallHugged = ({
  path,
  options: _options,
  print,
  fallback,
  callScope,
  allowlist,
}: CallInput): Doc => {
  const node = path.node
  if (!hasType(node)) {
    return fallback()
  }
  const args = readArrayField(node, 'arguments')

  if (args.length === 0) {
    return fallback()
  }
  const { children, hasNullHole } = collectChildren(args)
  if (hasNullHole) {
    return fallback()
  }
  if (hasDanglingComment(readCommentsField(node))) {
    return fallback()
  }
  if (callNeedsParens(path)) {
    return fallback()
  }
  if (node['typeArguments'] !== undefined && node['typeArguments'] !== null) {
    return fallback()
  }
  if (node['optional'] === true) {
    return fallback()
  }
  if (!isHuggableCall(node['callee'], callScope, allowlist)) {
    return fallback()
  }
  if (containsTag(children, 'SpreadElement')) {
    return fallback()
  }
  if (childrenHaveLeadingOwnLineComment(childCommentMatrix(children))) {
    return fallback()
  }

  const calleeDoc: Doc = path.call(print, 'callee')
  const argDocs: Doc[] = []
  path.each((argPath: AstPath) => {
    argDocs.push(print(argPath))
  }, 'arguments')

  return [calleeDoc, printHuggedSiblings('(', ')', argDocs, false)]
}

export const printObjectHugged = ({
  path,
  options: _options,
  print,
  fallback,
}: BaseInput): Doc => {
  const node = path.node
  if (!hasType(node)) {
    return fallback()
  }
  const properties = readArrayField(node, 'properties')

  if (properties.length === 0) {
    return fallback()
  }
  const { children, hasNullHole } = collectChildren(properties)
  if (hasNullHole) {
    return fallback()
  }
  if (hasDanglingComment(readCommentsField(node))) {
    return fallback()
  }
  if (objectNeedsParens(path)) {
    return fallback()
  }
  if (containsTag(children, 'SpreadElement')) {
    return fallback()
  }
  if (containsTag(children, 'ExperimentalSpreadProperty')) {
    return fallback()
  }
  if (childrenHaveLeadingOwnLineComment(childCommentMatrix(children))) {
    return fallback()
  }

  const childDocs: Doc[] = []
  path.each((childPath: AstPath) => {
    childDocs.push(print(childPath))
  }, 'properties')

  return printHuggedSiblings('{', '}', childDocs, true)
}
