/**
 * Minimal AST surface area we read off Prettier's estree-flavored AST. We
 * don't import the full estree types — Prettier decorates them at runtime
 * (e.g. `comments`) and the upstream `@types/estree` package doesn't model
 * those decorations. We narrow with `in` checks instead.
 */

export interface AttachedComment {
  readonly type: 'Line' | 'Block'
  readonly value: string
  readonly leading?: boolean
  readonly trailing?: boolean
  readonly placement?: string
}

export const isObjectLike = (
  value: unknown,
): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

export const hasType = (
  value: unknown,
): value is Readonly<{ type: string }> & Readonly<Record<string, unknown>> =>
  isObjectLike(value) && 'type' in value && typeof value['type'] === 'string'

const stringField = (
  value: Readonly<Record<string, unknown>>,
  key: string,
): string | null => {
  const v = value[key]
  return typeof v === 'string' ? v : null
}

const isIdentifier = (
  value: unknown,
): value is Readonly<{ type: 'Identifier'; name: string }> =>
  hasType(value) &&
  value.type === 'Identifier' &&
  stringField(value, 'name') !== null

const isMemberExpression = (
  value: unknown,
): value is Readonly<{ type: 'MemberExpression'; property: unknown }> =>
  hasType(value) && value.type === 'MemberExpression' && 'property' in value

const isCallExpression = (
  value: unknown,
): value is Readonly<{ type: 'CallExpression'; callee: unknown }> =>
  hasType(value) && value.type === 'CallExpression' && 'callee' in value

/**
 * Walks a callee expression to find the rightmost identifier name, which is
 * the conventional "function name" for allowlist matching. `Html.div` → `div`,
 * `bar()(baz)` → `baz`. Returns `null` if nothing identifier-shaped is reachable.
 */
export const calleeName = (callee: unknown): string | null => {
  if (isIdentifier(callee)) {
    return callee.name
  }
  if (isMemberExpression(callee) && isIdentifier(callee.property)) {
    return callee.property.name
  }
  if (isCallExpression(callee)) {
    return calleeName(callee.callee)
  }
  return null
}

export const readArrayField = (
  node: Readonly<Record<string, unknown>>,
  key: string,
): ReadonlyArray<unknown> => {
  const v = node[key]
  return Array.isArray(v) ? v : []
}

export const readCommentsField = (
  node: Readonly<Record<string, unknown>> | null,
): ReadonlyArray<AttachedComment> => {
  if (node === null) {
    return []
  }
  const v = node['comments']
  if (!Array.isArray(v)) {
    return []
  }
  const out: AttachedComment[] = []
  for (const c of v) {
    if (!isObjectLike(c)) {
      continue
    }
    const type = c['type']
    const value = c['value']
    if ((type === 'Line' || type === 'Block') && typeof value === 'string') {
      const partial: {
        -readonly [K in keyof AttachedComment]: AttachedComment[K]
      } = {
        type,
        value,
      }
      if (typeof c['leading'] === 'boolean') {
        partial.leading = c['leading']
      }
      if (typeof c['trailing'] === 'boolean') {
        partial.trailing = c['trailing']
      }
      if (typeof c['placement'] === 'string') {
        partial.placement = c['placement']
      }
      out.push(partial)
    }
  }
  return out
}

export const readStringOption = (
  options: object,
  key: string,
  fallback: string,
): string => {
  if (!isObjectLike(options)) {
    return fallback
  }
  const value = options[key]
  return typeof value === 'string' ? value : fallback
}

export const readChoiceOption = <Choice extends string>(
  options: object,
  key: string,
  choices: ReadonlyArray<Choice>,
  fallback: Choice,
): Choice => {
  if (!isObjectLike(options)) {
    return fallback
  }
  const value = options[key]
  if (typeof value !== 'string') {
    return fallback
  }
  for (const c of choices) {
    if (c === value) {
      return c
    }
  }
  return fallback
}
