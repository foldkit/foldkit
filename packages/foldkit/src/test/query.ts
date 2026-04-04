import {
  Array,
  Equal,
  Match,
  Option,
  Predicate,
  Record,
  String as String_,
  flow,
  pipe,
} from 'effect'
import { dual } from 'effect/Function'

import { evo } from '../struct'
import type { VNode } from '../vdom'

// SELECTOR PARSING

type MatchMode = 'Exact' | 'StartsWith'

type AttributeMatcher = Readonly<{
  name: string
  value: Option.Option<string>
  mode: MatchMode
}>

type SimpleSelector = Readonly<{
  tag: Option.Option<string>
  id: Option.Option<string>
  classes: ReadonlyArray<string>
  attributes: ReadonlyArray<AttributeMatcher>
}>

type Selector = ReadonlyArray<SimpleSelector>

type MatchResult = Readonly<{ consumed: string; group: string }>

const ID_PATTERN = /^#([a-zA-Z0-9_-]+)/
const CLASS_PATTERN = /^\.([a-zA-Z0-9_-]+)/
const ATTRIBUTE_PATTERN = /^\[([a-zA-Z][a-zA-Z0-9_-]*)(?:(\^)?="([^"]*)")?\]/
const TAG_PATTERN = /^([a-zA-Z][a-zA-Z0-9-]*)/
const WHITESPACE_PATTERN = /\s+/

const matchGroup =
  (regex: RegExp) =>
  (input: string): Option.Option<MatchResult> =>
    pipe(
      input,
      String_.match(regex),
      Option.flatMap(match =>
        pipe(
          match,
          Array.get(1),
          Option.map(group => ({
            consumed: match[0],
            group,
          })),
        ),
      ),
    )

const emptySelector: SimpleSelector = {
  tag: Option.none(),
  id: Option.none(),
  classes: [],
  attributes: [],
}

const tryParseId = (
  input: string,
  accumulator: SimpleSelector,
): Option.Option<SimpleSelector> =>
  pipe(
    input,
    matchGroup(ID_PATTERN),
    Option.map(({ consumed, group }) =>
      parseModifiers(
        input.slice(consumed.length),
        evo(accumulator, {
          id: () => Option.some(group),
        }),
      ),
    ),
  )

const tryParseClass = (
  input: string,
  accumulator: SimpleSelector,
): Option.Option<SimpleSelector> =>
  pipe(
    input,
    matchGroup(CLASS_PATTERN),
    Option.map(({ consumed, group }) =>
      parseModifiers(
        input.slice(consumed.length),
        evo(accumulator, {
          classes: Array.append(group),
        }),
      ),
    ),
  )

const tryParseAttribute = (
  input: string,
  accumulator: SimpleSelector,
): Option.Option<SimpleSelector> =>
  pipe(
    input,
    String_.match(ATTRIBUTE_PATTERN),
    Option.flatMap(match =>
      pipe(
        match,
        Array.get(1),
        Option.map(name => {
          const mode: MatchMode = match[2] === '^' ? 'StartsWith' : 'Exact'
          return parseModifiers(
            input.slice(match[0].length),
            evo(accumulator, {
              attributes: Array.append({
                name,
                value: Option.fromNullable(match[3]),
                mode,
              }),
            }),
          )
        }),
      ),
    ),
  )

const parseModifiers = (
  input: string,
  accumulator: SimpleSelector,
): SimpleSelector => {
  if (String_.isEmpty(input)) return accumulator

  return pipe(
    tryParseId(input, accumulator),
    Option.orElse(() => tryParseClass(input, accumulator)),
    Option.orElse(() => tryParseAttribute(input, accumulator)),
    Option.getOrElse(() => {
      throw new Error(
        `I could not parse the selector at "${input}".\n\n` +
          'Supported selectors: tag, #id, .class, [attr], [attr="value"], [attr^="prefix"], ' +
          'and descendant combinators (space).',
      )
    }),
  )
}

const parseCompoundSelector = (segment: string): SimpleSelector =>
  pipe(
    segment,
    String_.match(TAG_PATTERN),
    Option.match({
      onNone: () => parseModifiers(segment, emptySelector),
      onSome: match =>
        parseModifiers(
          segment.slice(match[0].length),
          evo(emptySelector, { tag: () => Array.get(match, 1) }),
        ),
    }),
  )

export const parseSelector = (input: string): Selector => {
  const trimmed = String_.trim(input)
  if (String_.isEmpty(trimmed)) {
    throw new Error(
      'I received an empty selector.\n\n' +
        'Provide a CSS selector like "button", "#email", or \'[role="tab"]\'.',
    )
  }

  return pipe(
    trimmed,
    String_.split(WHITESPACE_PATTERN),
    Array.map(parseCompoundSelector),
  )
}

// NODE UTILITIES

const lookupAttribute =
  (name: string) =>
  (vnode: VNode): Option.Option<unknown> =>
    pipe(
      vnode.data?.attrs?.[name],
      Option.fromNullable,
      Option.orElse(() => Option.fromNullable(vnode.data?.props?.[name])),
    )

const lookupStringAttribute =
  (name: string) =>
  (vnode: VNode): Option.Option<string> =>
    Option.map(lookupAttribute(name)(vnode), String)

const isElement = (node: VNode): boolean => !Predicate.isUndefined(node.sel)

const isVNode = (child: VNode | string): child is VNode =>
  !Predicate.isString(child)

const vnodeChildren = (vnode: VNode): ReadonlyArray<VNode> =>
  Array.filterMap(vnode.children ?? [], Option.liftPredicate(isVNode))

const collectDescendants = (vnode: VNode): ReadonlyArray<VNode> =>
  Array.flatMap(vnodeChildren(vnode), child => [
    child,
    ...collectDescendants(child),
  ])

const FORM_CONTROL_TAGS = ['input', 'select', 'textarea', 'button', 'output']

const isFormControl = (node: VNode): boolean =>
  pipe(
    node.sel,
    Option.fromNullable,
    Option.exists(sel => Array.contains(FORM_CONTROL_TAGS, sel)),
  )

const findById =
  (root: VNode) =>
  (id: string): Option.Option<VNode> =>
    Array.findFirst(
      [root, ...collectDescendants(root)],
      flow(lookupStringAttribute('id'), Option.exists(Equal.equals(id))),
    )

// MATCHING

const compareByMode =
  (mode: MatchMode, expected: string) =>
  (actual: string): boolean =>
    Match.value(mode).pipe(
      Match.when('StartsWith', () => actual.startsWith(expected)),
      Match.when('Exact', () => actual === expected),
      Match.exhaustive,
    )

const matchesValue =
  (maybeExpected: Option.Option<string>, mode: MatchMode) =>
  (maybeActual: Option.Option<string>): boolean =>
    Option.match(maybeActual, {
      onNone: () => false,
      onSome: actual =>
        Option.match(maybeExpected, {
          onNone: () => true,
          onSome: expected => compareByMode(mode, expected)(actual),
        }),
    })

const matchesAttribute =
  (vnode: VNode) =>
  ({ name, value, mode }: AttributeMatcher): boolean => {
    if (name === 'key') {
      return pipe(
        vnode.key,
        Option.fromNullable,
        Option.map(key =>
          typeof key === 'symbol' ? key.toString() : String(key),
        ),
        matchesValue(value, mode),
      )
    }

    return pipe(
      vnode,
      lookupAttribute(name),
      Option.filter(actual => actual !== false),
      Option.map(String),
      matchesValue(value, mode),
    )
  }

const matchesSimpleSelector =
  (selector: SimpleSelector) =>
  (vnode: VNode): boolean =>
    isElement(vnode) &&
    Option.match(selector.tag, {
      onNone: () => true,
      onSome: tag => vnode.sel === tag,
    }) &&
    Option.match(selector.id, {
      onNone: () => true,
      onSome: id =>
        pipe(
          vnode,
          lookupStringAttribute('id'),
          Option.exists(Equal.equals(id)),
        ),
    }) &&
    Array.every(
      selector.classes,
      className => vnode.data?.class?.[className] === true,
    ) &&
    Array.every(selector.attributes, matchesAttribute(vnode))

// IMPLICIT ROLES

const IMPLICIT_ROLE_MAP: Record<string, string> = {
  a: 'link',
  article: 'article',
  button: 'button',
  form: 'form',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  li: 'listitem',
  nav: 'navigation',
  ol: 'list',
  option: 'option',
  select: 'combobox',
  table: 'table',
  textarea: 'textbox',
  ul: 'list',
}

const INPUT_TYPE_ROLE_MAP: Record<string, string> = {
  checkbox: 'checkbox',
  number: 'spinbutton',
  radio: 'radio',
  range: 'slider',
  reset: 'button',
  search: 'searchbox',
  submit: 'button',
}

const inputRole = (vnode: VNode): Option.Option<string> =>
  pipe(
    vnode,
    lookupStringAttribute('type'),
    Option.getOrElse(() => 'text'),
    Option.liftPredicate(typeString => typeString !== 'hidden'),
    Option.map(typeString =>
      pipe(
        INPUT_TYPE_ROLE_MAP,
        Record.get(typeString),
        Option.getOrElse(() => 'textbox'),
      ),
    ),
  )

const implicitRole = (vnode: VNode): Option.Option<string> =>
  pipe(
    vnode.sel,
    Option.fromNullable,
    Option.flatMap(tag =>
      tag === 'input' ? inputRole(vnode) : Record.get(IMPLICIT_ROLE_MAP, tag),
    ),
  )

const resolveRole = (vnode: VNode): Option.Option<string> =>
  pipe(
    vnode,
    lookupStringAttribute('role'),
    Option.orElse(() => implicitRole(vnode)),
  )

// ACCESSIBLE NAME

const nonEmptyString = (value: unknown): Option.Option<string> =>
  Option.filter(Option.some(String(value)), String_.isNonEmpty)

const nameFromLabelledBy = (vnode: VNode, root: VNode): Option.Option<string> =>
  pipe(
    vnode,
    lookupAttribute('aria-labelledby'),
    Option.flatMap(nonEmptyString),
    Option.map(labelledBy =>
      pipe(
        labelledBy,
        String_.split(WHITESPACE_PATTERN),
        Array.filterMap(flow(findById(root), Option.map(textContent))),
        Array.join(' '),
      ),
    ),
    Option.filter(String_.isNonEmpty),
  )

const nameFromAriaLabel = (vnode: VNode): Option.Option<string> =>
  pipe(vnode, lookupAttribute('aria-label'), Option.flatMap(nonEmptyString))

const nameFromLabelFor = (vnode: VNode, root: VNode): Option.Option<string> =>
  pipe(
    vnode,
    lookupStringAttribute('id'),
    Option.flatMap(idString =>
      pipe(
        [root, ...collectDescendants(root)],
        Array.findFirst(
          node =>
            node.sel === 'label' &&
            pipe(
              node,
              lookupStringAttribute('for'),
              Option.exists(Equal.equals(idString)),
            ),
        ),
        Option.map(textContent),
      ),
    ),
  )

const nameFromTextContent = (vnode: VNode): Option.Option<string> =>
  Option.filter(Option.some(textContent(vnode)), String_.isNonEmpty)

const nameFromTitle = (vnode: VNode): Option.Option<string> =>
  pipe(vnode, lookupAttribute('title'), Option.flatMap(nonEmptyString))

const accessibleName = (vnode: VNode, root: VNode): string =>
  pipe(
    nameFromLabelledBy(vnode, root),
    Option.orElse(() => nameFromAriaLabel(vnode)),
    Option.orElse(() => nameFromLabelFor(vnode, root)),
    Option.orElse(() => nameFromTextContent(vnode)),
    Option.orElse(() => nameFromTitle(vnode)),
    Option.getOrElse(() => ''),
  )

// PUBLIC API

const findAllImpl =
  (selectorString: string) =>
  (html: VNode): ReadonlyArray<VNode> => {
    const selector = parseSelector(selectorString)
    const allNodes = [html, ...collectDescendants(html)]

    return pipe(
      Array.head(selector),
      Option.map(firstSegment =>
        Array.reduce(
          Array.drop(selector, 1),
          Array.filter(allNodes, matchesSimpleSelector(firstSegment)),
          (candidates, segment) =>
            Array.filter(
              Array.flatMap(candidates, collectDescendants),
              matchesSimpleSelector(segment),
            ),
        ),
      ),
      Option.getOrElse(() => []),
    )
  }

/** Finds the first VNode matching the CSS selector. */
export const find: {
  (html: VNode, selectorString: string): Option.Option<VNode>
  (selectorString: string): (html: VNode) => Option.Option<VNode>
} = dual(
  2,
  (html: VNode, selectorString: string): Option.Option<VNode> =>
    pipe(html, findAllImpl(selectorString), Array.head),
)

/** Finds all VNodes matching the CSS selector. */
export const findAll: {
  (html: VNode, selectorString: string): ReadonlyArray<VNode>
  (selectorString: string): (html: VNode) => ReadonlyArray<VNode>
} = dual(2, (html: VNode, selectorString: string) =>
  findAllImpl(selectorString)(html),
)

/** Extracts all text content from a VNode tree, depth-first. */
export const textContent = (vnode: VNode): string => {
  if (Predicate.isString(vnode.text)) return vnode.text

  return pipe(
    vnode.children ?? [],
    Array.map(child =>
      Predicate.isString(child) ? child : textContent(child),
    ),
    Array.join(''),
  )
}

const attrImpl = (vnode: VNode, name: string): Option.Option<string> => {
  if (name === 'class') {
    return pipe(
      vnode.data?.class,
      Option.fromNullable,
      Option.map(
        flow(
          Record.toEntries,
          Array.filter(([, isActive]) => isActive),
          Array.map(([className]) => className),
          Array.join(' '),
        ),
      ),
      Option.filter(String_.isNonEmpty),
    )
  }

  return lookupStringAttribute(name)(vnode)
}

/** Reads an attribute or prop value from a VNode. */
export const attr: {
  (vnode: VNode, name: string): Option.Option<string>
  (name: string): (vnode: VNode) => Option.Option<string>
} = dual(2, attrImpl)

// ACCESSIBLE LOCATORS

/** Finds the first element with the given ARIA role and optional accessible name. */
export const getByRole =
  (role: string, options?: Readonly<{ name?: string }>) =>
  (html: VNode): Option.Option<VNode> => {
    const maybeName = Option.fromNullable(options?.name)

    return Array.findFirst(
      [html, ...collectDescendants(html)],
      node =>
        pipe(node, resolveRole, Option.exists(Equal.equals(role))) &&
        Option.match(maybeName, {
          onNone: () => true,
          onSome: name => accessibleName(node, html) === name,
        }),
    )
  }

/** Finds all elements with the given ARIA role and optional accessible name. */
export const getAllByRole = (
  html: VNode,
  role: string,
  options?: Readonly<{ name?: string }>,
): ReadonlyArray<VNode> => {
  const maybeName = Option.fromNullable(options?.name)

  return Array.filter(
    [html, ...collectDescendants(html)],
    node =>
      pipe(node, resolveRole, Option.exists(Equal.equals(role))) &&
      Option.match(maybeName, {
        onNone: () => true,
        onSome: Equal.equals(accessibleName(node, html)),
      }),
  )
}

/** Finds the most specific element matching the given text content.
 *  Skips text VNodes (sel undefined) — only returns actual DOM elements. */
export const getByText =
  (target: string, options?: Readonly<{ exact?: boolean }>) =>
  (html: VNode): Option.Option<VNode> => {
    const exact = options?.exact !== false

    const textMatches = (node: VNode): boolean => {
      const nodeText = textContent(node)
      return exact ? nodeText === target : String_.includes(target)(nodeText)
    }

    return pipe(
      [html, ...collectDescendants(html)],
      Array.filter(node => isElement(node) && textMatches(node)),
      Array.findFirst(
        match =>
          !Array.some(
            Array.filter(collectDescendants(match), isElement),
            textMatches,
          ),
      ),
    )
  }

/** Finds the first element with the given placeholder attribute. */
export const getByPlaceholder =
  (placeholderValue: string) =>
  (html: VNode): Option.Option<VNode> =>
    Array.findFirst(
      [html, ...collectDescendants(html)],
      flow(
        lookupStringAttribute('placeholder'),
        Option.exists(Equal.equals(placeholderValue)),
      ),
    )

/** Finds the first element with the given label text. Checks `aria-label`
 *  first, then `<label for="id">` association, then `<label>` nesting. */
export const getByLabel =
  (labelValue: string) =>
  (html: VNode): Option.Option<VNode> => {
    const allNodes = [html, ...collectDescendants(html)]

    return pipe(
      Array.findFirst(
        allNodes,
        flow(
          lookupStringAttribute('aria-label'),
          Option.exists(Equal.equals(labelValue)),
        ),
      ),
      Option.orElse(() =>
        pipe(
          Array.filter(
            allNodes,
            node => node.sel === 'label' && textContent(node) === labelValue,
          ),
          Array.filterMap(labelNode =>
            pipe(
              lookupStringAttribute('for')(labelNode),
              Option.flatMap(findById(html)),
              Option.orElse(() =>
                Array.findFirst(collectDescendants(labelNode), isFormControl),
              ),
            ),
          ),
          Array.head,
        ),
      ),
    )
  }

// LOCATORS

/** A deferred element query that resolves against a VNode tree. Callable as a
 *  function (`locator(html)`) so it composes directly in `flow` and `pipe` chains.
 *  Used by interaction steps (`click`, `type`, `submit`, `keydown`) to
 *  target elements by accessible attributes instead of CSS selectors. */
export type Locator = ((html: VNode) => Option.Option<VNode>) &
  Readonly<{ description: string }>

const makeLocator = (
  resolve: (html: VNode) => Option.Option<VNode>,
  description: string,
): Locator => Object.assign(resolve, { description } as const)

/** Creates a Locator that finds an element by ARIA role and optional accessible name. */
export const role = (
  roleValue: string,
  options?: Readonly<{ name?: string }>,
): Locator =>
  makeLocator(
    getByRole(roleValue, options),
    Option.match(Option.fromNullable(options?.name), {
      onNone: () => roleValue,
      onSome: name => `${roleValue} "${name}"`,
    }),
  )

/** Creates a Locator that finds an element by placeholder attribute. */
export const placeholder = (placeholderValue: string): Locator =>
  makeLocator(
    getByPlaceholder(placeholderValue),
    `placeholder "${placeholderValue}"`,
  )

/** Creates a Locator that finds an element by aria-label. */
export const label = (labelValue: string): Locator =>
  makeLocator(getByLabel(labelValue), `label "${labelValue}"`)

/** Creates a Locator that finds the most specific element matching the given text content. */
export const text = (
  target: string,
  options?: Readonly<{ exact?: boolean }>,
): Locator => makeLocator(getByText(target, options), `text "${target}"`)

/** Creates a Locator that wraps a CSS selector. Escape hatch for cases
 *  where no accessible attribute is available. */
export const selector = (css: string): Locator =>
  makeLocator(flow(findAllImpl(css), Array.head), `"${css}"`)

/** Creates a scoped Locator that finds the child within the parent.
 *  Composes via `Option.flatMap` — the parent is resolved first, then
 *  the child is searched within the parent's subtree. */
export const within: {
  (parent: Locator, child: Locator): Locator
  (child: Locator): (parent: Locator) => Locator
} = dual(
  2,
  (parent: Locator, child: Locator): Locator =>
    makeLocator(
      flow(parent, Option.flatMap(child)),
      `${child.description} within ${parent.description}`,
    ),
)

/** Resolves a target (CSS selector string or Locator) against a VNode tree. */
export const resolveTarget = (
  html: VNode,
  target: string | Locator,
): Readonly<{ maybeElement: Option.Option<VNode>; description: string }> => {
  if (typeof target === 'string') {
    return {
      maybeElement: pipe(html, findAllImpl(target), Array.head),
      description: `"${target}"`,
    }
  }
  return { maybeElement: target(html), description: target.description }
}
