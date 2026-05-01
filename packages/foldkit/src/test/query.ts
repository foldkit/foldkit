import {
  Array,
  Equal,
  Match,
  Number as Number_,
  Option,
  Predicate,
  Record,
  String as String_,
  flow,
  pipe,
} from 'effect'
import { dual } from 'effect/Function'

import { evo } from '../struct/index.js'
import type { VNode } from '../vdom.js'

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
                value: Option.fromNullishOr(match[3]),
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
      Option.fromNullishOr,
      Option.orElse(() => Option.fromNullishOr(vnode.data?.props?.[name])),
    )

const lookupStringAttribute =
  (name: string) =>
  (vnode: VNode): Option.Option<string> =>
    pipe(vnode, lookupAttribute(name), Option.map(String))

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

const allNodesIn = (vnode: VNode): ReadonlyArray<VNode> => [
  vnode,
  ...collectDescendants(vnode),
]

/** Returns the ancestor chain of `target` within `root`, ordered from root to
 *  the immediate parent of `target` (exclusive). Returns an empty array when
 *  `target` is `root` itself or is not present in the subtree. */
export const ancestorsOf =
  (target: VNode) =>
  (root: VNode): ReadonlyArray<VNode> => {
    const walk = (
      node: VNode,
      chain: ReadonlyArray<VNode>,
    ): ReadonlyArray<VNode> | undefined => {
      if (node === target) {
        return chain
      }
      for (const child of vnodeChildren(node)) {
        const result = walk(child, [...chain, node])
        if (result !== undefined) {
          return result
        }
      }
      return undefined
    }
    return walk(root, []) ?? []
  }

const attributeEquals =
  (name: string, expected: string) =>
  (vnode: VNode): boolean =>
    pipe(
      vnode,
      lookupStringAttribute(name),
      Option.exists(Equal.equals(expected)),
    )

const FORM_CONTROL_TAGS = ['input', 'select', 'textarea', 'button', 'output']

const isFormControl = (node: VNode): boolean =>
  pipe(
    node.sel,
    Option.fromNullishOr,
    Option.exists(sel => Array.contains(FORM_CONTROL_TAGS, sel)),
  )

const findById =
  (root: VNode) =>
  (id: string): Option.Option<VNode> =>
    Array.findFirst(allNodesIn(root), attributeEquals('id', id))

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
        Option.fromNullishOr,
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
  article: 'article',
  aside: 'complementary',
  button: 'button',
  details: 'group',
  dialog: 'dialog',
  fieldset: 'group',
  figure: 'figure',
  form: 'form',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  hr: 'separator',
  li: 'listitem',
  main: 'main',
  meter: 'meter',
  nav: 'navigation',
  ol: 'list',
  option: 'option',
  output: 'status',
  p: 'paragraph',
  progress: 'progressbar',
  select: 'combobox',
  summary: 'button',
  table: 'table',
  td: 'cell',
  textarea: 'textbox',
  tr: 'row',
  ul: 'list',
}

const INPUT_TYPE_ROLE_MAP: Record<string, string> = {
  button: 'button',
  checkbox: 'checkbox',
  image: 'button',
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

const imgRole = (vnode: VNode): string =>
  pipe(
    vnode,
    lookupAttribute('alt'),
    Option.match({
      onNone: () => 'img',
      onSome: value => (String(value) === '' ? 'presentation' : 'img'),
    }),
  )

const linkOrGenericRole = (vnode: VNode): string =>
  pipe(
    vnode,
    lookupAttribute('href'),
    Option.match({
      onNone: () => 'generic',
      onSome: () => 'link',
    }),
  )

const thRole = (vnode: VNode): string =>
  pipe(
    vnode,
    lookupStringAttribute('scope'),
    Option.exists(Equal.equals('row')),
  )
    ? 'rowheader'
    : 'columnheader'

const LANDMARK_EXCLUDING_ANCESTORS: ReadonlyArray<string> = [
  'article',
  'aside',
  'main',
  'nav',
  'section',
]

const isInsideLandmarkAncestor =
  (root: VNode) =>
  (vnode: VNode): boolean =>
    pipe(
      root,
      ancestorsOf(vnode),
      Array.some(
        ({ sel }) =>
          sel !== undefined &&
          Array.contains(LANDMARK_EXCLUDING_ANCESTORS, sel),
      ),
    )

const headerOrFooterRole =
  (bannerRole: 'banner' | 'contentinfo') =>
  (root: VNode) =>
  (vnode: VNode): string =>
    isInsideLandmarkAncestor(root)(vnode) ? 'generic' : bannerRole

const sectionRole =
  (root: VNode) =>
  (vnode: VNode): string =>
    pipe(
      vnode,
      nameFromLabelledBy(root),
      Option.orElse(() => nameFromAriaLabel(vnode)),
      Option.orElse(() => nameFromTitle(vnode)),
      Option.match({
        onNone: () => 'generic',
        onSome: () => 'region',
      }),
    )

const implicitRole =
  (root: VNode) =>
  (vnode: VNode): Option.Option<string> =>
    pipe(
      vnode.sel,
      Option.fromNullishOr,
      Option.flatMap(tag =>
        Match.value(tag).pipe(
          Match.when('input', () => inputRole(vnode)),
          Match.when('img', () => Option.some(imgRole(vnode))),
          Match.whenOr('a', 'area', () =>
            Option.some(linkOrGenericRole(vnode)),
          ),
          Match.when('th', () => Option.some(thRole(vnode))),
          Match.when('header', () =>
            Option.some(headerOrFooterRole('banner')(root)(vnode)),
          ),
          Match.when('footer', () =>
            Option.some(headerOrFooterRole('contentinfo')(root)(vnode)),
          ),
          Match.when('section', () => Option.some(sectionRole(root)(vnode))),
          Match.orElse(() => Record.get(IMPLICIT_ROLE_MAP, tag)),
        ),
      ),
    )

const resolveRoles =
  (root: VNode) =>
  (vnode: VNode): ReadonlyArray<string> =>
    pipe(
      vnode,
      lookupStringAttribute('role'),
      Option.map(
        flow(
          String_.split(WHITESPACE_PATTERN),
          Array.filter(String_.isNonEmpty),
        ),
      ),
      Option.getOrElse(() => Option.toArray(implicitRole(root)(vnode))),
    )

// ACCESSIBLE NAME

const nonEmptyString = (value: unknown): Option.Option<string> =>
  Option.filter(Option.some(String(value)), String_.isNonEmpty)

const nameFromLabelledBy =
  (root: VNode) =>
  (vnode: VNode): Option.Option<string> =>
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

const nameFromLabelFor =
  (root: VNode) =>
  (vnode: VNode): Option.Option<string> =>
    pipe(
      vnode,
      lookupStringAttribute('id'),
      Option.flatMap(idString =>
        pipe(
          allNodesIn(root),
          Array.findFirst(
            node =>
              node.sel === 'label' &&
              pipe(
                node,
                lookupStringAttribute('htmlFor'),
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

const findFirstDirectChildWithTag =
  (tag: string) =>
  (vnode: VNode): Option.Option<VNode> =>
    Array.findFirst(vnodeChildren(vnode), ({ sel }) => sel === tag)

const nameFromChildTag =
  (childTag: string) =>
  (vnode: VNode): Option.Option<string> =>
    pipe(
      vnode,
      findFirstDirectChildWithTag(childTag),
      Option.map(textContent),
      Option.flatMap(nonEmptyString),
    )

const INPUT_BUTTON_TYPES = ['button', 'reset', 'submit']

const nameFromInput = (vnode: VNode): Option.Option<string> => {
  const type = pipe(
    vnode,
    lookupStringAttribute('type'),
    Option.getOrElse(() => 'text'),
  )
  if (type === 'image') {
    return pipe(vnode, lookupAttribute('alt'), Option.flatMap(nonEmptyString))
  }
  if (Array.contains(INPUT_BUTTON_TYPES, type)) {
    return pipe(vnode, lookupAttribute('value'), Option.flatMap(nonEmptyString))
  }
  return Option.none()
}

const nameFromNativeHost = (vnode: VNode): Option.Option<string> =>
  Match.value(vnode.sel).pipe(
    Match.whenOr('img', 'area', () =>
      pipe(vnode, lookupAttribute('alt'), Option.flatMap(nonEmptyString)),
    ),
    Match.when('input', () => nameFromInput(vnode)),
    Match.when('fieldset', () => nameFromChildTag('legend')(vnode)),
    Match.when('figure', () => nameFromChildTag('figcaption')(vnode)),
    Match.when('table', () => nameFromChildTag('caption')(vnode)),
    Match.orElse(() => Option.none()),
  )

/** Computes the accessible name of an element. Resolves via
 *  `aria-labelledby`, `aria-label`, `<label for>`, native host language
 *  attributes and child elements (img/area alt, input value/alt,
 *  fieldset legend, figure figcaption, table caption), text content,
 *  then `title`. */
export const accessibleName =
  (root: VNode) =>
  (vnode: VNode): string =>
    pipe(
      vnode,
      nameFromLabelledBy(root),
      Option.orElse(() => nameFromAriaLabel(vnode)),
      Option.orElse(() => nameFromLabelFor(root)(vnode)),
      Option.orElse(() => nameFromNativeHost(vnode)),
      Option.orElse(() => nameFromTextContent(vnode)),
      Option.orElse(() => nameFromTitle(vnode)),
      Option.getOrElse(() => ''),
    )

/** Computes the accessible description of an element. Resolves via
 *  `aria-describedby` (joining referenced elements' text content). */
export const accessibleDescription =
  (root: VNode) =>
  (vnode: VNode): string =>
    pipe(
      vnode,
      lookupAttribute('aria-describedby'),
      Option.flatMap(nonEmptyString),
      Option.match({
        onNone: () => '',
        onSome: flow(
          String_.split(WHITESPACE_PATTERN),
          Array.filterMap(flow(findById(root), Option.map(textContent))),
          Array.join(' '),
        ),
      }),
    )

// PUBLIC API

const findAllImpl =
  (selectorString: string) =>
  (html: VNode): ReadonlyArray<VNode> => {
    const selector = parseSelector(selectorString)
    const allNodes = allNodesIn(html)

    return pipe(
      selector,
      Array.head,
      Option.match({
        onNone: () => [],
        onSome: firstSegment =>
          Array.reduce(
            Array.drop(selector, 1),
            Array.filter(allNodes, matchesSimpleSelector(firstSegment)),
            (candidates, segment) =>
              Array.filter(
                Array.flatMap(candidates, collectDescendants),
                matchesSimpleSelector(segment),
              ),
          ),
      }),
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

const hasDirectTextNodeMatch = (node: VNode, target: string): boolean =>
  Array.some(node.children ?? [], child =>
    Predicate.isString(child)
      ? child === target
      : !isElement(child) && textContent(child) === target,
  )

const attrImpl = (vnode: VNode, name: string): Option.Option<string> => {
  if (name === 'class') {
    return pipe(
      vnode.data?.class,
      Option.fromNullishOr,
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

const HEADING_LEVEL_PATTERN = /^h([1-6])$/

const headingLevelFromTag = (vnode: VNode): Option.Option<number> =>
  pipe(
    vnode.sel,
    Option.fromNullishOr,
    Option.flatMap(String_.match(HEADING_LEVEL_PATTERN)),
    Option.map(match => Number(match[1])),
  )

const ariaLevel = (vnode: VNode): Option.Option<number> =>
  pipe(
    vnode,
    lookupStringAttribute('aria-level'),
    Option.flatMap(Number_.parse),
    Option.filter(value => !Number.isNaN(value)),
  )

const resolveLevel = (vnode: VNode): Option.Option<number> =>
  Option.orElse(ariaLevel(vnode), () => headingLevelFromTag(vnode))

const ariaTriStateMatches =
  (attribute: string, expected: boolean | 'mixed') =>
  (vnode: VNode): boolean =>
    pipe(
      vnode,
      lookupStringAttribute(attribute),
      Option.exists(value => value === String(expected)),
    )

const checkedMatches =
  (expected: boolean | 'mixed') =>
  (vnode: VNode): boolean => {
    const fromAria = ariaTriStateMatches('aria-checked', expected)(vnode)
    if (fromAria) return true
    if (expected === 'mixed') return false
    return pipe(
      vnode,
      lookupAttribute('checked'),
      Option.exists(value => Boolean(value) === expected),
    )
  }

const selectedMatches =
  (expected: boolean) =>
  (vnode: VNode): boolean => {
    const fromAria = ariaTriStateMatches('aria-selected', expected)(vnode)
    if (fromAria) return true
    return pipe(
      vnode,
      lookupAttribute('selected'),
      Option.exists(value => Boolean(value) === expected),
    )
  }

const disabledMatches =
  (expected: boolean) =>
  (vnode: VNode): boolean => {
    const ariaValue = lookupStringAttribute('aria-disabled')(vnode)
    if (Option.isSome(ariaValue)) {
      return ariaValue.value === String(expected)
    }
    const disabled = pipe(
      vnode,
      lookupAttribute('disabled'),
      Option.exists(Boolean),
    )
    return disabled === expected
  }

type RoleOptions = Readonly<{
  name?: string | RegExp
  level?: number
  checked?: boolean | 'mixed'
  selected?: boolean
  pressed?: boolean | 'mixed'
  expanded?: boolean
  disabled?: boolean
}>

const roleOptionsMatch =
  (options: RoleOptions | undefined, html: VNode) =>
  (node: VNode): boolean => {
    if (!options) return true

    if (options.name !== undefined) {
      const actual = accessibleName(html)(node)
      const matches =
        options.name instanceof RegExp
          ? options.name.test(actual)
          : actual === options.name
      if (!matches) {
        return false
      }
    }
    if (
      options.level !== undefined &&
      !Option.exists(resolveLevel(node), Equal.equals(options.level))
    ) {
      return false
    }
    if (
      options.checked !== undefined &&
      !checkedMatches(options.checked)(node)
    ) {
      return false
    }
    if (
      options.selected !== undefined &&
      !selectedMatches(options.selected)(node)
    ) {
      return false
    }
    if (
      options.pressed !== undefined &&
      !ariaTriStateMatches('aria-pressed', options.pressed)(node)
    ) {
      return false
    }
    if (
      options.expanded !== undefined &&
      !ariaTriStateMatches('aria-expanded', options.expanded)(node)
    ) {
      return false
    }
    if (
      options.disabled !== undefined &&
      !disabledMatches(options.disabled)(node)
    ) {
      return false
    }
    return true
  }

/** Finds the first element with the given ARIA role and optional matching options.
 *  Supports `name` (accessible name), `level` (heading level), `checked`,
 *  `selected`, `pressed`, `expanded`, and `disabled` state filters. */
export const getByRole =
  (role: string, options?: RoleOptions) =>
  (html: VNode): Option.Option<VNode> => {
    const matchesOptions = roleOptionsMatch(options, html)
    const resolveRolesInRoot = resolveRoles(html)
    return Array.findFirst(
      allNodesIn(html),
      node =>
        pipe(node, resolveRolesInRoot, Array.contains(role)) &&
        matchesOptions(node),
    )
  }

/** Finds all elements with the given ARIA role and optional matching options. */
export const getAllByRole =
  (role: string, options?: RoleOptions) =>
  (html: VNode): ReadonlyArray<VNode> => {
    const matchesOptions = roleOptionsMatch(options, html)
    const resolveRolesInRoot = resolveRoles(html)
    return Array.filter(
      allNodesIn(html),
      node =>
        pipe(node, resolveRolesInRoot, Array.contains(role)) &&
        matchesOptions(node),
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
      return exact
        ? nodeText === target || hasDirectTextNodeMatch(node, target)
        : String_.includes(target)(nodeText)
    }

    return pipe(
      allNodesIn(html),
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
      allNodesIn(html),
      attributeEquals('placeholder', placeholderValue),
    )

/** Finds the first element with the given label text. Checks `aria-label`
 *  first, then `<label for="id">` association, then `<label>` nesting,
 *  then `aria-labelledby` reverse lookup. */
export const getByLabel =
  (labelValue: string) =>
  (html: VNode): Option.Option<VNode> => {
    const allNodes = allNodesIn(html)

    return pipe(
      Array.findFirst(allNodes, attributeEquals('aria-label', labelValue)),
      Option.orElse(() =>
        pipe(
          Array.filter(
            allNodes,
            node => node.sel === 'label' && textContent(node) === labelValue,
          ),
          Array.filterMap(labelNode =>
            pipe(
              labelNode,
              lookupStringAttribute('htmlFor'),
              Option.flatMap(findById(html)),
              Option.orElse(() =>
                Array.findFirst(collectDescendants(labelNode), isFormControl),
              ),
            ),
          ),
          Array.head,
        ),
      ),
      Option.orElse(() =>
        Array.findFirst(
          allNodes,
          flow(
            nameFromLabelledBy(html),
            Option.exists(Equal.equals(labelValue)),
          ),
        ),
      ),
    )
  }

/** Finds every element with the given label text. Applies the same four
 *  resolution strategies as `getByLabel` (`aria-label`, `<label for="id">`,
 *  `<label>` nesting, `aria-labelledby`) and returns deduplicated matches. */
export const getAllByLabel =
  (labelValue: string) =>
  (html: VNode): ReadonlyArray<VNode> => {
    const allNodes = allNodesIn(html)

    const viaAriaLabel = Array.filter(
      allNodes,
      attributeEquals('aria-label', labelValue),
    )

    const viaLabelElement = pipe(
      Array.filter(
        allNodes,
        node => node.sel === 'label' && textContent(node) === labelValue,
      ),
      Array.flatMap(labelNode =>
        pipe(
          labelNode,
          lookupStringAttribute('htmlFor'),
          Option.flatMap(findById(html)),
          Option.match({
            onNone: () =>
              Array.filter(collectDescendants(labelNode), isFormControl),
            onSome: control => [control],
          }),
        ),
      ),
    )

    const viaLabelledBy = Array.filter(
      allNodes,
      flow(nameFromLabelledBy(html), Option.exists(Equal.equals(labelValue))),
    )

    return Array.dedupe([...viaAriaLabel, ...viaLabelElement, ...viaLabelledBy])
  }

/** Finds the first element with the given `alt` attribute. */
export const getByAltText =
  (altValue: string) =>
  (html: VNode): Option.Option<VNode> =>
    Array.findFirst(allNodesIn(html), attributeEquals('alt', altValue))

/** Finds the first element with the given `title` attribute. */
export const getByTitle =
  (titleValue: string) =>
  (html: VNode): Option.Option<VNode> =>
    Array.findFirst(allNodesIn(html), attributeEquals('title', titleValue))

/** Finds the first element with the given `data-testid` attribute. */
export const getByTestId =
  (testIdValue: string) =>
  (html: VNode): Option.Option<VNode> =>
    Array.findFirst(
      allNodesIn(html),
      attributeEquals('data-testid', testIdValue),
    )

/** Finds all elements matching the given text content.
 *  Includes nested ancestors — a `<div><p>hi</p></div>` with text "hi" yields both. */
export const getAllByText =
  (target: string, options?: Readonly<{ exact?: boolean }>) =>
  (html: VNode): ReadonlyArray<VNode> => {
    const exact = options?.exact !== false
    return Array.filter(allNodesIn(html), node => {
      if (!isElement(node)) return false
      const nodeText = textContent(node)
      return exact
        ? nodeText === target || hasDirectTextNodeMatch(node, target)
        : String_.includes(target)(nodeText)
    })
  }

/** Finds all elements with the given placeholder attribute. */
export const getAllByPlaceholder =
  (placeholderValue: string) =>
  (html: VNode): ReadonlyArray<VNode> =>
    Array.filter(
      allNodesIn(html),
      attributeEquals('placeholder', placeholderValue),
    )

/** Finds all elements with the given `alt` attribute. */
export const getAllByAltText =
  (altValue: string) =>
  (html: VNode): ReadonlyArray<VNode> =>
    Array.filter(allNodesIn(html), attributeEquals('alt', altValue))

/** Finds all elements with the given `title` attribute. */
export const getAllByTitle =
  (titleValue: string) =>
  (html: VNode): ReadonlyArray<VNode> =>
    Array.filter(allNodesIn(html), attributeEquals('title', titleValue))

/** Finds all elements with the given `data-testid` attribute. */
export const getAllByTestId =
  (testIdValue: string) =>
  (html: VNode): ReadonlyArray<VNode> =>
    Array.filter(allNodesIn(html), attributeEquals('data-testid', testIdValue))

/** Finds all form controls whose current value matches. */
export const getAllByDisplayValue =
  (displayValueString: string) =>
  (html: VNode): ReadonlyArray<VNode> =>
    Array.filter(
      allNodesIn(html),
      node =>
        isFormControl(node) &&
        attributeEquals('value', displayValueString)(node),
    )

/** Finds the first form control whose current value matches. Checks the `value`
 *  attribute on inputs, textareas, and selects. */
export const getByDisplayValue =
  (displayValue: string) =>
  (html: VNode): Option.Option<VNode> =>
    Array.findFirst(
      allNodesIn(html),
      node =>
        isFormControl(node) && attributeEquals('value', displayValue)(node),
    )

// LOCATORS

/** A deferred element query that resolves against a VNode tree. Callable as a
 *  function (`locator(html)`) so it composes directly in `flow` and `pipe` chains.
 *  Used by interaction steps (`click`, `type`, `submit`, `keydown`) to
 *  target elements by accessible attributes instead of CSS selectors. */
export type Locator = ((html: VNode) => Option.Option<VNode>) &
  Readonly<{ description: string }>

/** A deferred multi-element query that resolves to all matching VNodes.
 *  Produced by `all*` locator factories and by `filter(...)`. Convert to a
 *  single-match `Locator` via `first`, `last`, or `nth(n)`. */
export type LocatorAll = ((html: VNode) => ReadonlyArray<VNode>) &
  Readonly<{ description: string }>

const makeLocator = (
  resolve: (html: VNode) => Option.Option<VNode>,
  description: string,
): Locator => Object.assign(resolve, { description } as const)

const makeLocatorAll = (
  resolve: (html: VNode) => ReadonlyArray<VNode>,
  description: string,
): LocatorAll => Object.assign(resolve, { description } as const)

const describeRoleOptions = (options: RoleOptions): string => {
  const parts: Array<string> = []
  if (options.name !== undefined) {
    parts.push(
      options.name instanceof RegExp ? `${options.name}` : `"${options.name}"`,
    )
  }
  if (options.level !== undefined) parts.push(`level=${options.level}`)
  if (options.checked !== undefined) parts.push(`checked=${options.checked}`)
  if (options.selected !== undefined) parts.push(`selected=${options.selected}`)
  if (options.pressed !== undefined) parts.push(`pressed=${options.pressed}`)
  if (options.expanded !== undefined) parts.push(`expanded=${options.expanded}`)
  if (options.disabled !== undefined) parts.push(`disabled=${options.disabled}`)
  return Array.join(parts, ' ')
}

/** Creates a Locator that finds an element by ARIA role. Supports matching on
 *  `name`, `level`, `checked`, `selected`, `pressed`, `expanded`, and `disabled`. */
export const role = (roleValue: string, options?: RoleOptions): Locator => {
  const optionsDescription = options ? describeRoleOptions(options) : ''
  const description = String_.isEmpty(optionsDescription)
    ? roleValue
    : `${roleValue} ${optionsDescription}`
  return makeLocator(getByRole(roleValue, options), description)
}

/** Creates a Locator that finds an element by placeholder attribute. */
export const placeholder = (placeholderValue: string): Locator =>
  makeLocator(
    getByPlaceholder(placeholderValue),
    `placeholder "${placeholderValue}"`,
  )

/** Creates a Locator that finds an element by aria-label. */
export const label = (labelValue: string): Locator =>
  makeLocator(getByLabel(labelValue), `label "${labelValue}"`)

/** Creates a Locator that finds an element by its `alt` attribute. */
export const altText = (altValue: string): Locator =>
  makeLocator(getByAltText(altValue), `alt text "${altValue}"`)

/** Creates a Locator that finds an element by its `title` attribute. */
export const title = (titleValue: string): Locator =>
  makeLocator(getByTitle(titleValue), `title "${titleValue}"`)

/** Creates a Locator that finds an element by its `data-testid` attribute. */
export const testId = (testIdValue: string): Locator =>
  makeLocator(getByTestId(testIdValue), `testId "${testIdValue}"`)

/** Creates a Locator that finds a form control by its current `value`. */
export const displayValue = (valueString: string): Locator =>
  makeLocator(getByDisplayValue(valueString), `display value "${valueString}"`)

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

// LOCATOR-ALL FACTORIES

/** Creates a LocatorAll that finds every element matching the role. */
export const allRole = (
  roleValue: string,
  options?: RoleOptions,
): LocatorAll => {
  const optionsDescription = options ? describeRoleOptions(options) : ''
  const description = String_.isEmpty(optionsDescription)
    ? roleValue
    : `${roleValue} ${optionsDescription}`
  return makeLocatorAll(getAllByRole(roleValue, options), `all ${description}`)
}

/** Creates a LocatorAll that finds every element matching the text. */
export const allText = (
  target: string,
  options?: Readonly<{ exact?: boolean }>,
): LocatorAll =>
  makeLocatorAll(getAllByText(target, options), `all text "${target}"`)

/** Creates a LocatorAll that finds every element with the given label. */
export const allLabel = (labelValue: string): LocatorAll =>
  makeLocatorAll(getAllByLabel(labelValue), `all label "${labelValue}"`)

/** Creates a LocatorAll that finds every element with the given placeholder. */
export const allPlaceholder = (placeholderValue: string): LocatorAll =>
  makeLocatorAll(
    getAllByPlaceholder(placeholderValue),
    `all placeholder "${placeholderValue}"`,
  )

/** Creates a LocatorAll that finds every element with the given alt text. */
export const allAltText = (altValue: string): LocatorAll =>
  makeLocatorAll(getAllByAltText(altValue), `all alt text "${altValue}"`)

/** Creates a LocatorAll that finds every element with the given title. */
export const allTitle = (titleValue: string): LocatorAll =>
  makeLocatorAll(getAllByTitle(titleValue), `all title "${titleValue}"`)

/** Creates a LocatorAll that finds every element with the given data-testid. */
export const allTestId = (testIdValue: string): LocatorAll =>
  makeLocatorAll(getAllByTestId(testIdValue), `all testId "${testIdValue}"`)

/** Creates a LocatorAll that finds every form control with the given value. */
export const allDisplayValue = (valueString: string): LocatorAll =>
  makeLocatorAll(
    getAllByDisplayValue(valueString),
    `all display value "${valueString}"`,
  )

/** Creates a LocatorAll from a CSS selector — returns every match. */
export const allSelector = (css: string): LocatorAll =>
  makeLocatorAll(findAllImpl(css), `all "${css}"`)

// LOCATOR-ALL COMBINATORS

/** Picks the first match from a LocatorAll, producing a single-match Locator. */
export const first = (locatorAll: LocatorAll): Locator =>
  makeLocator(
    flow(locatorAll, Array.head),
    `first of ${locatorAll.description}`,
  )

/** Picks the last match from a LocatorAll, producing a single-match Locator. */
export const last = (locatorAll: LocatorAll): Locator =>
  makeLocator(flow(locatorAll, Array.last), `last of ${locatorAll.description}`)

/** Picks the nth match (0-indexed) from a LocatorAll, producing a Locator. */
export const nth: {
  (locatorAll: LocatorAll, index: number): Locator
  (index: number): (locatorAll: LocatorAll) => Locator
} = dual(
  2,
  (locatorAll: LocatorAll, index: number): Locator =>
    makeLocator(
      flow(locatorAll, Array.get(index)),
      `nth(${index}) of ${locatorAll.description}`,
    ),
)

type FilterOptions = Readonly<{
  has?: Locator
  hasNot?: Locator
  hasText?: string
  hasNotText?: string
}>

const describeFilterOptions = (options: FilterOptions): string => {
  const parts: Array<string> = []
  if (options.has) parts.push(`has ${options.has.description}`)
  if (options.hasNot) parts.push(`hasNot ${options.hasNot.description}`)
  if (options.hasText !== undefined) parts.push(`hasText "${options.hasText}"`)
  if (options.hasNotText !== undefined) {
    parts.push(`hasNotText "${options.hasNotText}"`)
  }
  return Array.join(parts, ', ')
}

/** Filters a LocatorAll's matches. Supports `has`/`hasNot` to keep entries
 *  that do/don't contain a matching descendant, and `hasText`/`hasNotText`
 *  to keep entries whose text content does/doesn't include a substring. */
export const filter: {
  (locatorAll: LocatorAll, options: FilterOptions): LocatorAll
  (options: FilterOptions): (locatorAll: LocatorAll) => LocatorAll
} = dual(
  2,
  (locatorAll: LocatorAll, options: FilterOptions): LocatorAll =>
    makeLocatorAll(
      html =>
        Array.filter(locatorAll(html), match => {
          if (options.has && Option.isNone(options.has(match))) return false
          if (options.hasNot && Option.isSome(options.hasNot(match))) {
            return false
          }
          if (options.hasText !== undefined) {
            if (!String_.includes(options.hasText)(textContent(match))) {
              return false
            }
          }
          if (options.hasNotText !== undefined) {
            if (String_.includes(options.hasNotText)(textContent(match))) {
              return false
            }
          }
          return true
        }),
      `${locatorAll.description} filtered by (${describeFilterOptions(options)})`,
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
