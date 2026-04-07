import { Option, pipe } from 'effect'
import { h } from 'snabbdom'
import type { VNode } from 'snabbdom'
import { describe, expect, test } from 'vitest'

import {
  initialModel as interactionsInitialModel,
  update as interactionsUpdate,
  view as interactionsView,
} from './apps/interactions'
import { update as keyUpdate, view as keyView } from './apps/keypress'
import {
  Authenticate,
  FailedAuthenticate,
  SucceededAuthenticate,
  initialModel,
  update,
  view,
} from './apps/login'
import type { Model } from './apps/login'
import {
  RequestedLogout,
  initialModel as logoutInitialModel,
  update as logoutUpdate,
  view as logoutView,
} from './apps/logoutButton'
import {
  initialModel as multiRoleInitialModel,
  update as multiRoleUpdate,
  view as multiRoleView,
} from './apps/multiRole'
import { parseSelector } from './query'
import {
  attr,
  find,
  findAll,
  getAllByRole,
  getByAltText,
  getByDisplayValue,
  getByLabel,
  getByPlaceholder,
  getByRole,
  getByTestId,
  getByText,
  getByTitle,
  textContent,
} from './query'
import * as Scene from './scene'

// TEST

describe('parseSelector', () => {
  test('parses a tag selector', () => {
    const selector = parseSelector('button')
    expect(selector).toHaveLength(1)
    expect(selector[0]?.tag).toEqual(Option.some('button'))
  })

  test('parses an id selector', () => {
    const selector = parseSelector('#email')
    expect(selector).toHaveLength(1)
    expect(selector[0]?.id).toEqual(Option.some('email'))
  })

  test('parses a class selector', () => {
    const selector = parseSelector('.primary')
    expect(selector).toHaveLength(1)
    expect(selector[0]?.classes).toEqual(['primary'])
  })

  test('parses an attribute selector', () => {
    const selector = parseSelector('[role="tab"]')
    expect(selector).toHaveLength(1)
    expect(selector[0]?.attributes).toEqual([
      { name: 'role', value: Option.some('tab'), mode: 'Exact' },
    ])
  })

  test('parses a presence-only attribute selector', () => {
    const selector = parseSelector('[disabled]')
    expect(selector).toHaveLength(1)
    expect(selector[0]?.attributes).toEqual([
      { name: 'disabled', value: Option.none(), mode: 'Exact' },
    ])
  })

  test('parses a compound selector', () => {
    const selector = parseSelector('button.primary[type="submit"]')
    expect(selector).toHaveLength(1)
    expect(selector[0]?.tag).toEqual(Option.some('button'))
    expect(selector[0]?.classes).toEqual(['primary'])
    expect(selector[0]?.attributes).toEqual([
      { name: 'type', value: Option.some('submit'), mode: 'Exact' },
    ])
  })

  test('parses a descendant selector', () => {
    const selector = parseSelector('form button')
    expect(selector).toHaveLength(2)
    expect(selector[0]?.tag).toEqual(Option.some('form'))
    expect(selector[1]?.tag).toEqual(Option.some('button'))
  })

  test('parses a starts-with attribute selector', () => {
    const selector = parseSelector('[key^="tab-"]')
    expect(selector).toHaveLength(1)
    expect(selector[0]?.attributes).toEqual([
      { name: 'key', value: Option.some('tab-'), mode: 'StartsWith' },
    ])
  })

  test('throws on empty selector', () => {
    expect(() => parseSelector('')).toThrow('I received an empty selector')
  })

  test('throws on invalid selector', () => {
    expect(() => parseSelector('>>>')).toThrow('I could not parse the selector')
  })
})

describe('query functions', () => {
  const tree: VNode = h('div', { props: { id: 'root' } }, [
    h('form', { class: { 'login-form': true } }, [
      h('input', { props: { id: 'email', type: 'email' } }),
      h('input', { props: { id: 'password', type: 'password' } }),
      h('button', { props: { type: 'submit' }, class: { primary: true } }, [
        'Sign in',
      ]),
    ]),
    h('p', { attrs: { role: 'alert' }, class: { error: true } }, [
      'Something went wrong',
    ]),
    h('div', { key: 'tablist' }, [
      h('button', { key: 'tab-0' }, ['First']),
      h('button', { key: 'tab-1' }, ['Second']),
      h('button', { key: 'tab-2' }, ['Third']),
    ]),
  ])

  describe('find', () => {
    test('finds by tag', () => {
      expect(Option.isSome(find(tree, 'form'))).toBe(true)
    })

    test('finds by id', () => {
      expect(Option.isSome(find(tree, '#email'))).toBe(true)
      expect(
        pipe(
          find(tree, '#email'),
          Option.map(vnode => vnode.data?.props?.['type']),
        ),
      ).toEqual(Option.some('email'))
    })

    test('finds by class', () => {
      expect(Option.isSome(find(tree, '.primary'))).toBe(true)
    })

    test('finds by attribute value', () => {
      expect(Option.isSome(find(tree, '[type="submit"]'))).toBe(true)
    })

    test('finds by attribute presence', () => {
      expect(Option.isSome(find(tree, '[role]'))).toBe(true)
    })

    test('finds by compound selector', () => {
      expect(Option.isSome(find(tree, 'button.primary[type="submit"]'))).toBe(
        true,
      )
    })

    test('finds by descendant selector', () => {
      expect(Option.isSome(find(tree, 'form button'))).toBe(true)
    })

    test('finds by key', () => {
      expect(Option.isSome(find(tree, '[key="tablist"]'))).toBe(true)
    })

    test('finds by key with starts-with', () => {
      const tabs = findAll(tree, '[key^="tab-"]')
      expect(tabs).toHaveLength(3)
    })

    test('returns None for no match', () => {
      expect(Option.isNone(find(tree, '#nonexistent'))).toBe(true)
    })
  })

  describe('findAll', () => {
    test('finds all matching elements', () => {
      const inputs = findAll(tree, 'input')
      expect(inputs).toHaveLength(2)
    })

    test('finds descendants', () => {
      const formInputs = findAll(tree, 'form input')
      expect(formInputs).toHaveLength(2)
    })
  })

  describe('textContent', () => {
    test('extracts text from a leaf node', () => {
      const element = Option.getOrThrow(find(tree, '.primary'))
      expect(textContent(element)).toBe('Sign in')
    })

    test('extracts text from a subtree', () => {
      const element = Option.getOrThrow(find(tree, '[role="alert"]'))
      expect(textContent(element)).toBe('Something went wrong')
    })
  })

  describe('attr', () => {
    test('reads id from props', () => {
      const element = Option.getOrThrow(find(tree, '#email'))
      expect(attr(element, 'id')).toEqual(Option.some('email'))
    })

    test('reads type from props', () => {
      const element = Option.getOrThrow(find(tree, '#email'))
      expect(attr(element, 'type')).toEqual(Option.some('email'))
    })

    test('reads role from attrs', () => {
      const element = Option.getOrThrow(find(tree, '[role]'))
      expect(attr(element, 'role')).toEqual(Option.some('alert'))
    })

    test('reads class as space-separated string', () => {
      const element = Option.getOrThrow(find(tree, '.primary'))
      expect(attr(element, 'class')).toEqual(Option.some('primary'))
    })

    test('returns None for absent attribute', () => {
      const element = Option.getOrThrow(find(tree, '#email'))
      expect(Option.isNone(attr(element, 'role'))).toBe(true)
    })
  })
})

describe('accessible locators', () => {
  const locatorTree: VNode = h('div', {}, [
    h('h1', {}, ['Welcome']),
    h('form', { attrs: { 'aria-label': 'Login form' } }, [
      h('label', { props: { for: 'email' } }, ['Email']),
      h('input', {
        props: { id: 'email', type: 'email', placeholder: 'Email address' },
      }),
      h('label', { props: { for: 'pw' } }, ['Password']),
      h('input', {
        props: { id: 'pw', type: 'password', placeholder: 'Password' },
      }),
      h('button', { props: { type: 'submit' } }, ['Sign in']),
    ]),
    h('p', { attrs: { role: 'alert' } }, ['Invalid credentials']),
    h('nav', { attrs: { 'aria-label': 'Main navigation' } }, [
      h('a', { props: { href: '/' } }, ['Home']),
      h('a', { props: { href: '/about' } }, ['About']),
    ]),
    h('div', {}, [
      h('h2', { props: { id: 'section-title' } }, ['Section A']),
      h('ul', { attrs: { role: 'list', 'aria-labelledby': 'section-title' } }, [
        h('li', {}, ['Item 1']),
        h('li', {}, ['Item 2']),
      ]),
    ]),
    h('label', {}, ['Agree', h('input', { props: { type: 'checkbox' } })]),
    h('div', {}, [
      h('label', { props: { id: 'phone-label' } }, ['Phone']),
      h('input', {
        attrs: { 'aria-labelledby': 'phone-label' },
        props: { type: 'tel' },
      }),
    ]),
    h('img', { attrs: { alt: 'Company logo', src: '/logo.png' } }),
    h('button', { attrs: { title: 'Close dialog' } }, ['X']),
    h('div', { attrs: { 'data-testid': 'cart-summary' } }, ['2 items']),
    h('input', {
      attrs: { 'data-testid': 'search-box' },
      props: { type: 'text', value: 'hello world' },
    }),
    h('textarea', { props: { value: 'lorem ipsum' } }),
    h('select', { props: { value: 'apple' } }, [
      h('option', { props: { value: 'apple' } }, ['Apple']),
      h('option', { props: { value: 'banana' } }, ['Banana']),
    ]),
    h('h3', {}, ['Subsection']),
    h('div', { attrs: { role: 'heading', 'aria-level': '4' } }, [
      'ARIA heading',
    ]),
    h('input', {
      attrs: { 'aria-label': 'Subscribe' },
      props: { type: 'checkbox', checked: true },
    }),
    h('div', {
      attrs: {
        role: 'checkbox',
        'aria-checked': 'mixed',
        'aria-label': 'Mixed',
      },
    }),
    h('div', { attrs: { role: 'option', 'aria-selected': 'true' } }, [
      'Selected option',
    ]),
    h('button', { attrs: { 'aria-pressed': 'true' } }, ['Bold']),
    h('button', { attrs: { 'aria-expanded': 'false' } }, ['Menu']),
    h('button', { props: { disabled: true } }, ['Submit form']),
    h('button', { attrs: { 'aria-disabled': 'true' } }, ['Archived']),
    h('div', { attrs: { role: 'doc-subtitle heading' } }, ['Fallback heading']),
  ])

  describe('getByRole', () => {
    test('finds by explicit role', () => {
      expect(Option.isSome(getByRole('alert')(locatorTree))).toBe(true)
      expect(
        textContent(Option.getOrThrow(getByRole('alert')(locatorTree))),
      ).toBe('Invalid credentials')
    })

    test('finds by implicit role (button)', () => {
      expect(Option.isSome(getByRole('button')(locatorTree))).toBe(true)
    })

    test('finds by implicit role (heading)', () => {
      expect(Option.isSome(getByRole('heading')(locatorTree))).toBe(true)
      expect(
        textContent(Option.getOrThrow(getByRole('heading')(locatorTree))),
      ).toBe('Welcome')
    })

    test('finds by implicit role (form)', () => {
      expect(Option.isSome(getByRole('form')(locatorTree))).toBe(true)
    })

    test('finds by implicit role (link)', () => {
      expect(Option.isSome(getByRole('link')(locatorTree))).toBe(true)
      expect(
        textContent(Option.getOrThrow(getByRole('link')(locatorTree))),
      ).toBe('Home')
    })

    test('finds by implicit role (textbox) for input[type=email]', () => {
      expect(Option.isSome(getByRole('textbox')(locatorTree))).toBe(true)
    })

    test('finds by implicit role (list)', () => {
      expect(Option.isSome(getByRole('list')(locatorTree))).toBe(true)
    })

    test('filters by accessible name', () => {
      const result = getByRole('heading', { name: 'Section A' })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('h2')
    })

    test('returns None when name does not match', () => {
      expect(
        Option.isNone(
          getByRole('heading', { name: 'Nonexistent' })(locatorTree),
        ),
      ).toBe(true)
    })

    test('uses aria-label for accessible name', () => {
      const result = getByRole('form', { name: 'Login form' })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
    })

    test('resolves accessible name via aria-labelledby', () => {
      const result = getByRole('list', { name: 'Section A' })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('ul')
    })

    test('resolves accessible name via label for association', () => {
      const result = getByRole('textbox', { name: 'Email' })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('input')
    })

    test('returns None for nonexistent role', () => {
      expect(Option.isNone(getByRole('dialog')(locatorTree))).toBe(true)
    })

    test('finds element with a fallback role list by its first token', () => {
      const result = getByRole('doc-subtitle')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(textContent(Option.getOrThrow(result))).toBe('Fallback heading')
    })

    test('finds element with a fallback role list by a later token', () => {
      const results = getAllByRole('heading')(locatorTree)
      const texts = results.map(textContent)
      expect(texts).toContain('Fallback heading')
    })

    test('filters headings by level via tag', () => {
      const result = getByRole('heading', { level: 3 })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('h3')
    })

    test('filters headings by level via aria-level', () => {
      const result = getByRole('heading', { level: 4 })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('div')
    })

    test('filters checkbox by checked=true', () => {
      const result = getByRole('checkbox', {
        name: 'Subscribe',
        checked: true,
      })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
    })

    test('filters checkbox by aria-checked=mixed', () => {
      const result = getByRole('checkbox', { checked: 'mixed' })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('div')
    })

    test('filters option by selected=true', () => {
      const result = getByRole('option', { selected: true })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(textContent(Option.getOrThrow(result))).toBe('Selected option')
    })

    test('filters button by pressed=true', () => {
      const result = getByRole('button', { pressed: true })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(textContent(Option.getOrThrow(result))).toBe('Bold')
    })

    test('filters button by expanded=false', () => {
      const result = getByRole('button', { expanded: false })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(textContent(Option.getOrThrow(result))).toBe('Menu')
    })

    test('filters button by disabled=true via prop', () => {
      const result = getByRole('button', {
        name: 'Submit form',
        disabled: true,
      })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
    })

    test('filters button by aria-disabled=true', () => {
      const result = getByRole('button', {
        name: 'Archived',
        disabled: true,
      })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
    })

    test('combines multiple option filters', () => {
      const result = getByRole('checkbox', {
        name: 'Subscribe',
        checked: true,
        disabled: false,
      })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
    })
  })

  describe('getAllByRole', () => {
    test('finds all elements with role', () => {
      expect(getAllByRole('link')(locatorTree)).toHaveLength(2)
    })

    test('filters by name', () => {
      expect(getAllByRole('link', { name: 'About' })(locatorTree)).toHaveLength(
        1,
      )
    })

    test('finds all headings', () => {
      expect(getAllByRole('heading')(locatorTree)).toHaveLength(5)
    })

    test('finds all listitems', () => {
      expect(getAllByRole('listitem')(locatorTree)).toHaveLength(2)
    })
  })

  describe('getByText', () => {
    test('finds by exact text', () => {
      const result = getByText('Sign in')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('button')
    })

    test('returns the most specific match', () => {
      const result = getByText('Item 1')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('li')
    })

    test('finds by substring when exact is false', () => {
      const result = getByText('Invalid', { exact: false })(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(textContent(Option.getOrThrow(result))).toBe('Invalid credentials')
    })

    test('returns None for non-matching text', () => {
      expect(Option.isNone(getByText('Nonexistent')(locatorTree))).toBe(true)
    })

    test('does not match substring by default', () => {
      expect(Option.isNone(getByText('Invalid')(locatorTree))).toBe(true)
    })
  })

  describe('getByPlaceholder', () => {
    test('finds input by placeholder', () => {
      const result = getByPlaceholder('Email address')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('input')
    })

    test('returns None for non-matching placeholder', () => {
      expect(Option.isNone(getByPlaceholder('Phone number')(locatorTree))).toBe(
        true,
      )
    })
  })

  describe('getByLabel', () => {
    test('finds by aria-label', () => {
      const result = getByLabel('Main navigation')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('nav')
    })

    test('finds input via label for association', () => {
      const result = getByLabel('Email')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('input')
      expect(Option.getOrThrow(result).data?.props?.['id']).toBe('email')
    })

    test('finds input via label nesting', () => {
      const result = getByLabel('Agree')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('input')
      expect(Option.getOrThrow(result).data?.props?.['type']).toBe('checkbox')
    })

    test('finds input via aria-labelledby', () => {
      const result = getByLabel('Phone')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('input')
      expect(Option.getOrThrow(result).data?.props?.['type']).toBe('tel')
    })

    test('returns None for non-matching label', () => {
      expect(Option.isNone(getByLabel('Footer')(locatorTree))).toBe(true)
    })
  })

  describe('getByAltText', () => {
    test('finds element by alt attribute', () => {
      const result = getByAltText('Company logo')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('img')
    })

    test('returns None for non-matching alt text', () => {
      expect(Option.isNone(getByAltText('Nonexistent')(locatorTree))).toBe(true)
    })
  })

  describe('getByTitle', () => {
    test('finds element by title attribute', () => {
      const result = getByTitle('Close dialog')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('button')
    })

    test('returns None for non-matching title', () => {
      expect(Option.isNone(getByTitle('Nonexistent')(locatorTree))).toBe(true)
    })
  })

  describe('getByTestId', () => {
    test('finds element by data-testid attribute', () => {
      const result = getByTestId('cart-summary')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('div')
      expect(textContent(Option.getOrThrow(result))).toBe('2 items')
    })

    test('finds form controls by data-testid', () => {
      const result = getByTestId('search-box')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('input')
    })

    test('returns None for non-matching testid', () => {
      expect(Option.isNone(getByTestId('nonexistent')(locatorTree))).toBe(true)
    })
  })

  describe('getByDisplayValue', () => {
    test('finds input by current value', () => {
      const result = getByDisplayValue('hello world')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('input')
    })

    test('finds textarea by current value', () => {
      const result = getByDisplayValue('lorem ipsum')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      expect(Option.getOrThrow(result).sel).toBe('textarea')
    })

    test('finds select by current value', () => {
      const result = getByDisplayValue('apple')(locatorTree)
      expect(Option.isSome(result)).toBe(true)
      // The first match will be the select (form control) — option elements
      // aren't form controls in our allow-list, so they don't match.
      expect(Option.getOrThrow(result).sel).toBe('select')
    })

    test('returns None for non-matching value', () => {
      expect(Option.isNone(getByDisplayValue('Nonexistent')(locatorTree))).toBe(
        true,
      )
    })
  })
})

describe('multi-match locators', () => {
  const tree: VNode = h('ul', { attrs: { role: 'list' } }, [
    h('li', { attrs: { role: 'row' } }, [
      h('span', {}, ['Alice']),
      h('button', {}, ['Edit']),
    ]),
    h('li', { attrs: { role: 'row' } }, [
      h('span', {}, ['Bob']),
      h('button', {}, ['Edit']),
    ]),
    h('li', { attrs: { role: 'row' } }, [
      h('span', {}, ['Carol']),
      h('button', {}, ['Delete']),
    ]),
  ])

  test('all.role returns every matching element', () => {
    const matches = Scene.all.role('row')(tree)
    expect(matches).toHaveLength(3)
  })

  test('first resolves to the first match', () => {
    const locator = Scene.first(Scene.all.role('row'))
    const result = locator(tree)
    expect(Option.isSome(result)).toBe(true)
    expect(textContent(Option.getOrThrow(result))).toBe('AliceEdit')
  })

  test('last resolves to the last match', () => {
    const locator = Scene.last(Scene.all.role('row'))
    const result = locator(tree)
    expect(Option.isSome(result)).toBe(true)
    expect(textContent(Option.getOrThrow(result))).toBe('CarolDelete')
  })

  test('nth resolves to the nth match (data-first)', () => {
    const locator = Scene.nth(Scene.all.role('row'), 1)
    const result = locator(tree)
    expect(Option.isSome(result)).toBe(true)
    expect(textContent(Option.getOrThrow(result))).toBe('BobEdit')
  })

  test('nth resolves to the nth match (data-last)', () => {
    const locator = pipe(Scene.all.role('row'), Scene.nth(2))
    const result = locator(tree)
    expect(Option.isSome(result)).toBe(true)
    expect(textContent(Option.getOrThrow(result))).toBe('CarolDelete')
  })

  test('nth returns None for out-of-range index', () => {
    const locator = Scene.nth(Scene.all.role('row'), 99)
    expect(Option.isNone(locator(tree))).toBe(true)
  })

  test('filter by hasText narrows matches', () => {
    const filtered = Scene.filter(Scene.all.role('row'), { hasText: 'Bob' })
    expect(filtered(tree)).toHaveLength(1)
  })

  test('filter by hasNotText removes matches', () => {
    const filtered = Scene.filter(Scene.all.role('row'), {
      hasNotText: 'Bob',
    })
    expect(filtered(tree)).toHaveLength(2)
  })

  test('filter by has narrows to entries containing a descendant', () => {
    const filtered = Scene.filter(Scene.all.role('row'), {
      has: Scene.text('Delete'),
    })
    expect(filtered(tree)).toHaveLength(1)
  })

  test('filter by hasNot removes entries containing a descendant', () => {
    const filtered = Scene.filter(Scene.all.role('row'), {
      hasNot: Scene.text('Delete'),
    })
    expect(filtered(tree)).toHaveLength(2)
  })

  test('filter composes with first', () => {
    const locator = Scene.first(
      Scene.filter(Scene.all.role('row'), { hasText: 'Carol' }),
    )
    const result = locator(tree)
    expect(Option.isSome(result)).toBe(true)
    expect(textContent(Option.getOrThrow(result))).toBe('CarolDelete')
  })

  test('all.text finds every text match', () => {
    const matches = Scene.all.text('Edit')(tree)
    expect(matches).toHaveLength(2)
  })

  test('all.selector returns every CSS match', () => {
    const matches = Scene.all.selector('button')(tree)
    expect(matches).toHaveLength(3)
  })

  test('all.label finds every element matching via aria-label', () => {
    const labelTree: VNode = h('form', {}, [
      h('input', { attrs: { 'aria-label': 'Accept' } }),
      h('input', { attrs: { 'aria-label': 'Accept' } }),
      h('input', { attrs: { 'aria-label': 'Decline' } }),
    ])
    expect(Scene.all.label('Accept')(labelTree)).toHaveLength(2)
    expect(Scene.all.label('Decline')(labelTree)).toHaveLength(1)
  })

  test('all.label finds controls via <label for="id"> association', () => {
    const labelTree: VNode = h('form', {}, [
      h('label', { attrs: { for: 'a' } }, ['Item']),
      h('input', { attrs: { id: 'a' } }),
      h('label', { attrs: { for: 'b' } }, ['Item']),
      h('input', { attrs: { id: 'b' } }),
    ])
    expect(Scene.all.label('Item')(labelTree)).toHaveLength(2)
  })

  test('all.label finds controls via nested <label>', () => {
    const labelTree: VNode = h('form', {}, [
      h('label', {}, ['Item', h('input', {})]),
      h('label', {}, ['Item', h('input', {})]),
    ])
    expect(Scene.all.label('Item')(labelTree)).toHaveLength(2)
  })

  test('all.label dedupes when multiple strategies match the same element', () => {
    const labelTree: VNode = h('form', {}, [
      h('label', { attrs: { for: 'email' } }, ['Email']),
      h('input', {
        attrs: { id: 'email', 'aria-label': 'Email' },
      }),
    ])
    expect(Scene.all.label('Email')(labelTree)).toHaveLength(1)
  })
})

describe('custom matchers', () => {
  const element: VNode = h(
    'button',
    {
      props: { type: 'submit' },
      attrs: { 'aria-expanded': 'false' },
      class: { primary: true },
    },
    ['Sign in'],
  )

  test('toHaveText passes for matching text', () => {
    expect(Option.some(element)).toHaveText('Sign in')
  })

  test('toHaveText fails for non-matching text', () => {
    expect(() => expect(Option.some(element)).toHaveText('Log in')).toThrow(
      'Expected element to have text "Log in"',
    )
  })

  test('toContainText passes for substring match', () => {
    expect(Option.some(element)).toContainText('Sign')
  })

  test('toContainText fails for missing substring', () => {
    expect(() => expect(Option.some(element)).toContainText('Log')).toThrow(
      'Expected element to contain text "Log"',
    )
  })

  test('toHaveAttr passes for matching attribute value', () => {
    expect(Option.some(element)).toHaveAttr('type', 'submit')
  })

  test('toHaveAttr with presence-only passes when attribute exists', () => {
    expect(Option.some(element)).toHaveAttr('type')
  })

  test('toHaveAttr with presence-only fails when attribute is absent', () => {
    expect(() => expect(Option.some(element)).toHaveAttr('name')).toThrow(
      'Expected element to have attribute "name"',
    )
  })

  test('toExist passes for defined element', () => {
    expect(Option.some(element)).toExist()
  })

  test('toExist fails for undefined element', () => {
    expect(() => expect(Option.none()).toExist()).toThrow(
      'Expected element to exist',
    )
  })

  test('toBeAbsent passes for undefined element', () => {
    expect(Option.none()).toBeAbsent()
  })

  test('toBeAbsent fails for defined element', () => {
    expect(() => expect(Option.some(element)).toBeAbsent()).toThrow(
      'Expected element to be absent',
    )
  })

  test('toHaveText passes for matching regex', () => {
    expect(Option.some(element)).toHaveText(/^Sign/)
  })

  test('toHaveText fails for non-matching regex', () => {
    expect(() => expect(Option.some(element)).toHaveText(/^Log/)).toThrow(
      'Expected element to have text /^Log/',
    )
  })

  test('toContainText passes for matching regex', () => {
    expect(Option.some(element)).toContainText(/ign/)
  })

  test('toContainText fails for non-matching regex', () => {
    expect(() => expect(Option.some(element)).toContainText(/^Log$/)).toThrow(
      'Expected element to contain text /^Log$/',
    )
  })

  test('toBeEmpty passes for empty element', () => {
    expect(Option.some(h('div', {}, []))).toBeEmpty()
  })

  test('toBeEmpty fails for element with text', () => {
    expect(() =>
      expect(Option.some(h('div', {}, ['content']))).toBeEmpty(),
    ).toThrow('Expected element to be empty')
  })

  test('toBeEmpty fails for element with children', () => {
    expect(() =>
      expect(Option.some(h('div', {}, [h('span', {}, [])]))).toBeEmpty(),
    ).toThrow('Expected element to be empty')
  })

  test('not.toBeEmpty passes for element with content', () => {
    expect(Option.some(h('div', {}, ['content']))).not.toBeEmpty()
  })

  test('toBeVisible passes for default element', () => {
    expect(Option.some(element)).toBeVisible()
  })

  test('toBeVisible fails for element with hidden attribute', () => {
    const hidden: VNode = h('div', { attrs: { hidden: 'true' } }, [])
    expect(() => expect(Option.some(hidden)).toBeVisible()).toThrow(
      'Expected element to be visible',
    )
  })

  test('toBeVisible fails for element with aria-hidden="true"', () => {
    const hidden: VNode = h('div', { attrs: { 'aria-hidden': 'true' } }, [])
    expect(() => expect(Option.some(hidden)).toBeVisible()).toThrow(
      'Expected element to be visible',
    )
  })

  test('toBeVisible fails for display:none', () => {
    const hidden: VNode = h('div', { style: { display: 'none' } }, [])
    expect(() => expect(Option.some(hidden)).toBeVisible()).toThrow(
      'Expected element to be visible',
    )
  })

  test('toHaveId passes for matching id', () => {
    const withId: VNode = h('div', { attrs: { id: 'main' } }, [])
    expect(Option.some(withId)).toHaveId('main')
  })

  test('toHaveId fails for non-matching id', () => {
    const withId: VNode = h('div', { attrs: { id: 'main' } }, [])
    expect(() => expect(Option.some(withId)).toHaveId('sidebar')).toThrow(
      'Expected element to have id "sidebar"',
    )
  })

  test('toHaveId fails for element without id', () => {
    expect(() =>
      expect(Option.some(h('div', {}, []))).toHaveId('main'),
    ).toThrow('the element has no id')
  })
})

describe('scene', () => {
  test('renders the view after with', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.label('Email')).toExist(),
      Scene.expect(Scene.label('Password')).toExist(),
      Scene.expect(Scene.role('button')).toHaveText('Sign in'),
    )
  })

  test('type updates the Model through the view', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.expect(Scene.label('Email')).toHaveValue('alice@example.com'),
    )
  })

  test('submit dispatches the form Message', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.type(Scene.label('Password'), 'secret'),
      Scene.submit(Scene.role('form')),
      Scene.expect(Scene.role('button')).toHaveText('Signing in...'),
      Scene.tap(({ commands }) => {
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe(Authenticate.name)
      }),
      Scene.resolve(Authenticate, SucceededAuthenticate({ username: 'alice' })),
      Scene.expect(Scene.role('status')).toHaveText('Welcome, alice!'),
    )
  })

  test('clicking a disabled element throws a clear error', () => {
    const submittingModel: Model = {
      ...initialModel,
      status: 'Submitting',
      email: 'alice@example.com',
      password: 'secret',
    }

    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(submittingModel),
        Scene.click(Scene.role('button', { name: 'Signing in...' })),
      ),
    ).toThrow(/it is disabled/)
  })

  test('clicking a submit button falls through to the enclosing form', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.type(Scene.label('Password'), 'secret'),
      Scene.click(Scene.role('button', { name: 'Sign in' })),
      Scene.expect(Scene.role('button')).toHaveText('Signing in...'),
      Scene.resolve(Authenticate, SucceededAuthenticate({ username: 'alice' })),
      Scene.expect(Scene.role('status')).toHaveText('Welcome, alice!'),
    )
  })

  test('click dispatches the button Message', () => {
    const loggedInModel: Model = {
      ...initialModel,
      status: 'LoggedIn',
      username: 'alice',
    }

    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.tap(({ html }) => {
        expect(find(html, '[role="status"]')).toHaveText('Welcome, alice!')
      }),
      Scene.click(Scene.role('button', { name: 'Log out' })),
      Scene.expect(Scene.role('button')).toHaveText('Sign in'),
      Scene.expect(Scene.role('status')).toBeAbsent(),
    )
  })

  test('re-renders after resolve', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.submit(Scene.role('form')),
      Scene.expect(Scene.role('button')).toHaveText('Signing in...'),
      Scene.resolve(
        Authenticate,
        FailedAuthenticate({ error: 'Invalid credentials' }),
      ),
      Scene.tap(({ html }) => {
        expect(find(html, '[role="alert"]')).toHaveText('Invalid credentials')
        expect(find(html, '.retry')).toExist()
      }),
    )
  })

  test('keydown dispatches the key Message', () => {
    Scene.scene(
      { update: keyUpdate, view: keyView },
      Scene.with({ lastKey: '', isShifted: false }),
      Scene.keydown(Scene.role('application', { name: 'Key press area' }), 'a'),
      Scene.expect(Scene.label('Last key')).toHaveText('a'),
      Scene.expect(Scene.label('Shift pressed')).toHaveText('false'),
    )
  })

  test('keydown with modifiers', () => {
    Scene.scene(
      { update: keyUpdate, view: keyView },
      Scene.with({ lastKey: '', isShifted: false }),
      Scene.keydown(
        Scene.role('application', { name: 'Key press area' }),
        'A',
        { shiftKey: true },
      ),
      Scene.expect(Scene.label('Last key')).toHaveText('A'),
      Scene.expect(Scene.label('Shift pressed')).toHaveText('true'),
    )
  })

  test('re-renders after keydown so updated text is visible', () => {
    Scene.scene(
      { update: keyUpdate, view: keyView },
      Scene.with({ lastKey: '', isShifted: false }),
      Scene.keydown(Scene.role('application', { name: 'Key press area' }), 'x'),
      Scene.tap(({ html }) => {
        expect(getByLabel('Last key')(html)).toHaveText('x')
      }),
    )
  })
})

describe('scene with locators', () => {
  test('click accepts a Locator', () => {
    const loggedInModel: Model = {
      ...initialModel,
      status: 'LoggedIn',
      username: 'alice',
    }

    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.click(Scene.role('button', { name: 'Log out' })),
      Scene.expect(Scene.role('button')).toHaveText('Sign in'),
    )
  })

  test('type accepts a Locator', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.expect(Scene.label('Email')).toHaveValue('alice@example.com'),
    )
  })

  test('submit accepts a Locator', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.type(Scene.label('Password'), 'secret'),
      Scene.submit(Scene.role('form')),
      Scene.expect(Scene.role('button')).toHaveText('Signing in...'),
      Scene.resolve(Authenticate, SucceededAuthenticate({ username: 'alice' })),
    )
  })

  test('type is dual — data-last pipes the target', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      pipe(Scene.label('Email'), Scene.type('alice@example.com')),
      Scene.expect(Scene.label('Email')).toHaveValue('alice@example.com'),
    )
  })

  test('keydown is dual — data-last pipes the target', () => {
    Scene.scene(
      { update: keyUpdate, view: keyView },
      Scene.with({ lastKey: '', isShifted: false }),
      pipe(
        Scene.role('application', { name: 'Key press area' }),
        Scene.keydown('a'),
      ),
      Scene.expect(Scene.label('Last key')).toHaveText('a'),
    )
  })

  test('keydown data-last with modifiers', () => {
    Scene.scene(
      { update: keyUpdate, view: keyView },
      Scene.with({ lastKey: '', isShifted: false }),
      pipe(
        Scene.role('application', { name: 'Key press area' }),
        Scene.keydown('A', { shiftKey: true }),
      ),
      Scene.expect(Scene.label('Last key')).toHaveText('A'),
      Scene.expect(Scene.label('Shift pressed')).toHaveText('true'),
    )
  })

  test('locator error message uses description', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.click(Scene.role('button', { name: 'Nonexistent' })),
      ),
    ).toThrow('I could not find an element matching button "Nonexistent"')
  })
})

describe('scene with expect', () => {
  test('toExist passes when element exists', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('form')).toExist(),
    )
  })

  test('toExist throws when element is missing', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.expect(Scene.role('dialog')).toExist(),
      ),
    ).toThrow('Expected element matching dialog to exist but it does not.')
  })

  test('toBeAbsent passes when element is missing', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('dialog')).toBeAbsent(),
    )
  })

  test('toHaveText checks text content', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button')).toHaveText('Sign in'),
    )
  })

  test('toContainText checks substring', () => {
    const loggedInModel: Model = {
      ...initialModel,
      status: 'LoggedIn',
      username: 'alice',
    }

    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.expect(Scene.role('status')).toContainText('alice'),
    )
  })

  test('toHaveAttr checks attribute value', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.label('Email')).toHaveAttr('type', 'email'),
    )
  })

  test('not.toExist passes when element is missing', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('dialog')).not.toExist(),
    )
  })

  test('not.toHaveAttr checks attribute absence', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button')).not.toHaveAttr('disabled', 'true'),
    )
  })

  test('works between interaction steps', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button')).toHaveText('Sign in'),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.type(Scene.label('Password'), 'secret'),
      Scene.submit(Scene.role('form')),
      Scene.expect(Scene.role('button')).toHaveText('Signing in...'),
      Scene.resolve(Authenticate, SucceededAuthenticate({ username: 'alice' })),
      Scene.expect(Scene.role('status')).toHaveText('Welcome, alice!'),
    )
  })

  test('toHaveId checks element id', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.selector('#app')).toHaveId('app'),
      Scene.expect(Scene.label('Email')).toHaveId('email'),
    )
  })

  test('toHaveId fails when id does not match', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.expect(Scene.label('Email')).toHaveId('wrong'),
      ),
    ).toThrow(
      'Expected element matching label "Email" to have id "wrong" but received "email".',
    )
  })

  test('toHaveId not.toHaveId passes for different id', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.label('Email')).not.toHaveId('wrong'),
    )
  })

  test('toBeEmpty passes for empty element', () => {
    const loggedInModel: Model = {
      ...initialModel,
      status: 'LoggedIn',
      username: 'alice',
    }
    Scene.scene(
      { update, view: () => view(loggedInModel) },
      Scene.with(loggedInModel),
      Scene.expect(Scene.role('status')).not.toBeEmpty(),
    )
  })

  test('toBeEmpty fails for element with content', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.expect(Scene.role('button')).toBeEmpty(),
      ),
    ).toThrow(
      'Expected element matching button to be empty but received text "Sign in".',
    )
  })

  test('toHaveText accepts a regex', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button')).toHaveText(/^Sign in$/),
    )
  })

  test('toHaveText regex failure reports the pattern', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.expect(Scene.role('button')).toHaveText(/^Log in$/),
      ),
    ).toThrow('to have text /^Log in$/ but received "Sign in"')
  })

  test('toContainText accepts a regex', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button')).toContainText(/ign/),
    )
  })

  test('toHaveAccessibleName matches aria-label', () => {
    const loggedInModel: Model = {
      ...initialModel,
      status: 'LoggedIn',
      username: 'alice',
    }
    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.expect(Scene.role('region')).toHaveAccessibleName('User session'),
    )
  })

  test('toHaveAccessibleName matches via regex', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button')).toHaveAccessibleName(/^Sign/),
    )
  })

  test('toBeVisible passes for visible element', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button')).toBeVisible(),
    )
  })
})

describe('scene with extra interactions', () => {
  test('doubleClick fires the dblclick handler', () => {
    Scene.scene(
      { update: interactionsUpdate, view: interactionsView },
      Scene.with(interactionsInitialModel),
      Scene.doubleClick(Scene.label('action')),
      Scene.expect(Scene.label('action')).toContainText('dbl=1'),
    )
  })

  test('hover fires mouseenter handler', () => {
    Scene.scene(
      { update: interactionsUpdate, view: interactionsView },
      Scene.with(interactionsInitialModel),
      Scene.hover(Scene.label('action')),
      Scene.tap(({ html }) => {
        expect(html).toBeDefined()
      }),
    )
  })

  test('focus fires focus handler; blur fires blur handler', () => {
    Scene.scene(
      { update: interactionsUpdate, view: interactionsView },
      Scene.with(interactionsInitialModel),
      Scene.focus(Scene.label('name')),
      Scene.blur(Scene.label('name')),
    )
  })

  test('change fires change handler with the new value', () => {
    Scene.scene(
      { update: interactionsUpdate, view: interactionsView },
      Scene.with(interactionsInitialModel),
      Scene.change(Scene.label('fruit'), 'banana'),
    )
  })

  test('change is dual — data-last form works in pipe', () => {
    Scene.scene(
      { update: interactionsUpdate, view: interactionsView },
      Scene.with(interactionsInitialModel),
      pipe(Scene.label('fruit'), Scene.change('apple')),
    )
  })

  test('click still works through the new event-name map', () => {
    Scene.scene(
      { update: interactionsUpdate, view: interactionsView },
      Scene.with(interactionsInitialModel),
      Scene.click(Scene.label('action')),
      Scene.expect(Scene.label('action')).toContainText('clicks=1'),
    )
  })
})

describe('scene with expectAll', () => {
  const loggedInModel: Model = {
    ...initialModel,
    status: 'LoggedIn',
    username: 'alice',
  }

  test('toHaveCount matches the number of elements', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expectAll(Scene.all.role('button')).toHaveCount(1),
      Scene.expectAll(Scene.all.role('textbox')).toHaveCount(2),
    )
  })

  test('toHaveCount fails with clear count mismatch message', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.expectAll(Scene.all.role('button')).toHaveCount(3),
      ),
    ).toThrow(
      'Expected elements matching all button to have count 3 but received 1.',
    )
  })

  test('toBeEmpty passes when no matches', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expectAll(Scene.all.role('dialog')).toBeEmpty(),
    )
  })

  test('toBeEmpty fails when matches exist', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.expectAll(Scene.all.role('button')).toBeEmpty(),
      ),
    ).toThrow(
      'Expected elements matching all button to have count 0 but received 1.',
    )
  })

  test('not.toHaveCount inverts the assertion', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expectAll(Scene.all.role('button')).not.toHaveCount(3),
    )
  })

  test('expectAll respects Scene.inside scope', () => {
    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.inside(
        Scene.role('region', { name: 'User session' }),
        Scene.expectAll(Scene.all.role('button')).toHaveCount(1),
      ),
      Scene.expectAll(Scene.all.role('button')).toHaveCount(1),
    )
  })
})

describe('scene errors', () => {
  test('throws when element is not found', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.click('#nonexistent'),
      ),
    ).toThrow('I could not find an element matching "#nonexistent"')
  })

  test('throws when handler is missing', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.click('#email'),
      ),
    ).toThrow('has no click handler')
  })

  test('throws on unresolved Commands at end', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.submit(Scene.role('form')),
      ),
    ).toThrow('I found Commands without resolvers')
  })
})

describe('scene with resolveAll', () => {
  test('resolveAll works in scene context', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.submit(Scene.role('form')),
      Scene.resolveAll([
        Authenticate,
        SucceededAuthenticate({ username: 'bob' }),
      ]),
      Scene.expect(Scene.role('status')).toHaveText('Welcome, bob!'),
    )
  })
})

describe('scene with outMessage', () => {
  test('outMessage is tracked in scene', () => {
    Scene.scene(
      { update: logoutUpdate, view: logoutView },
      Scene.with(logoutInitialModel),
      Scene.click(Scene.role('button', { name: 'Log out' })),
      Scene.tap(({ outMessage }) => {
        expect(outMessage).toEqual(Option.some(RequestedLogout()))
      }),
    )
  })
})

describe('scene with within', () => {
  test('within scopes a locator to a parent', () => {
    const loggedInModel: Model = {
      ...initialModel,
      status: 'LoggedIn',
      username: 'alice',
    }

    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.expect(
        Scene.within(
          Scene.role('region', { name: 'User session' }),
          Scene.role('button', { name: 'Log out' }),
        ),
      ).toExist(),
    )
  })

  test('within returns absent when parent is not found', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(
        Scene.within(Scene.selector('.nonexistent'), Scene.role('button')),
      ).toBeAbsent(),
    )
  })

  test('within returns absent when child is not in parent', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(
        Scene.within(Scene.role('form'), Scene.role('status')),
      ).toBeAbsent(),
    )
  })

  test('within composes in pipe chains', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(
        pipe(Scene.role('form'), Scene.within(Scene.label('Email'))),
      ).toExist(),
    )
  })

  test('click works with within', () => {
    const loggedInModel: Model = {
      ...initialModel,
      status: 'LoggedIn',
      username: 'alice',
    }

    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.click(
        Scene.within(
          Scene.role('region', { name: 'User session' }),
          Scene.role('button', { name: 'Log out' }),
        ),
      ),
      Scene.expect(Scene.role('button')).toHaveText('Sign in'),
    )
  })

  test('within error message includes both descriptions', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.click(
          Scene.within(
            Scene.role('form'),
            Scene.role('button', { name: 'Nonexistent' }),
          ),
        ),
      ),
    ).toThrow(
      'I could not find an element matching button "Nonexistent" within form',
    )
  })
})

describe('scene with inside', () => {
  const loggedInModel: Model = {
    ...initialModel,
    status: 'LoggedIn',
    username: 'alice',
  }

  test('inside scopes multiple assertion steps to a parent', () => {
    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.inside(
        Scene.role('region', { name: 'User session' }),
        Scene.expect(Scene.role('status')).toContainText('Welcome, alice!'),
        Scene.expect(Scene.role('button', { name: 'Log out' })).toExist(),
      ),
    )
  })

  test('inside scopes interaction steps to a parent', () => {
    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.inside(
        Scene.role('region', { name: 'User session' }),
        Scene.click(Scene.role('button', { name: 'Log out' })),
      ),
      Scene.expect(Scene.role('button')).toHaveText('Sign in'),
    )
  })

  test('inside restores the prior scope after its block', () => {
    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.inside(
        Scene.role('region', { name: 'User session' }),
        Scene.expect(Scene.role('button', { name: 'Log out' })).toExist(),
      ),
      Scene.expect(Scene.role('region', { name: 'User session' })).toExist(),
    )
  })

  test('inside composes with nested inside via within', () => {
    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.inside(
        Scene.role('region', { name: 'User session' }),
        Scene.inside(
          Scene.role('button', { name: 'Log out' }),
          Scene.expect(Scene.text('Log out')).toExist(),
        ),
      ),
    )
  })

  test('inside fails with a scoped error when the child is not found', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(loggedInModel),
        Scene.inside(
          Scene.role('region', { name: 'User session' }),
          Scene.expect(Scene.role('button', { name: 'Sign in' })).toExist(),
        ),
      ),
    ).toThrow(
      'Expected element matching button "Sign in" within region "User session" to exist but it does not.',
    )
  })

  test('inside fails when the parent itself is not found', () => {
    expect(() =>
      Scene.scene(
        { update, view },
        Scene.with(initialModel),
        Scene.inside(
          Scene.role('region', { name: 'User session' }),
          Scene.expect(Scene.role('button')).toExist(),
        ),
      ),
    ).toThrow('within region "User session"')
  })

  test('inside scopes a CSS selector target', () => {
    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.inside(
        Scene.role('region', { name: 'User session' }),
        Scene.click('button'),
      ),
      Scene.expect(Scene.role('button')).toHaveText('Sign in'),
    )
  })

  test('inside passes the full html to tap (tap ignores scope)', () => {
    Scene.scene(
      { update, view },
      Scene.with(loggedInModel),
      Scene.inside(
        Scene.role('region', { name: 'User session' }),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[id="app"]')).toBeDefined()
        }),
      ),
    )
  })
})

describe('scene with text locator', () => {
  test('text locator finds by exact text', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.text('Sign in')).toExist(),
    )
  })

  test('text locator returns absent for non-matching text', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.text('Nonexistent')).toBeAbsent(),
    )
  })
})

describe('new matchers', () => {
  const inputWithValue: VNode = h('input', {
    props: { value: 'hello' },
  })

  const disabledButton: VNode = h('button', {
    props: { disabled: true },
  })

  const ariaDisabledButton: VNode = h('button', {
    attrs: { 'aria-disabled': 'true' },
  })

  const enabledButton: VNode = h('button', {
    props: { disabled: false },
  })

  const checkedCheckbox: VNode = h('input', {
    props: { type: 'checkbox', checked: true },
  })

  const ariaCheckedOption: VNode = h('div', {
    attrs: { role: 'option', 'aria-checked': 'true' },
  })

  test('toHaveValue passes for matching value', () => {
    expect(Option.some(inputWithValue)).toHaveValue('hello')
  })

  test('toHaveValue fails for non-matching value', () => {
    expect(() =>
      expect(Option.some(inputWithValue)).toHaveValue('world'),
    ).toThrow('Expected element to have value "world"')
  })

  test('toBeDisabled passes for disabled prop', () => {
    expect(Option.some(disabledButton)).toBeDisabled()
  })

  test('toBeDisabled passes for aria-disabled', () => {
    expect(Option.some(ariaDisabledButton)).toBeDisabled()
  })

  test('toBeDisabled fails for enabled element', () => {
    expect(() => expect(Option.some(enabledButton)).toBeDisabled()).toThrow(
      'Expected element to be disabled but it is not',
    )
  })

  test('toBeEnabled passes for enabled element', () => {
    expect(Option.some(enabledButton)).toBeEnabled()
  })

  test('toBeEnabled fails for disabled element', () => {
    expect(() => expect(Option.some(disabledButton)).toBeEnabled()).toThrow(
      'Expected element to be enabled but it is disabled',
    )
  })

  test('toBeChecked passes for checked prop', () => {
    expect(Option.some(checkedCheckbox)).toBeChecked()
  })

  test('toBeChecked passes for aria-checked', () => {
    expect(Option.some(ariaCheckedOption)).toBeChecked()
  })

  test('toBeChecked fails for unchecked element', () => {
    expect(() => expect(Option.some(enabledButton)).toBeChecked()).toThrow(
      'Expected element to be checked but it is not',
    )
  })

  test('Scene.expect toHaveValue works in scene context', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.expect(Scene.label('Email')).toHaveValue('alice@example.com'),
    )
  })

  test('Scene.expect toBeDisabled works in scene context', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button')).not.toBeDisabled(),
    )
  })

  test('Scene.expect toBeEnabled works in scene context', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button')).toBeEnabled(),
    )
  })

  test('Scene.role matches any token in a fallback role list', () => {
    Scene.scene(
      { update: multiRoleUpdate, view: multiRoleView },
      Scene.with(multiRoleInitialModel),
      Scene.expect(Scene.role('doc-subtitle')).toExist(),
      Scene.expect(Scene.role('heading')).toContainText('clicks=0'),
      Scene.click(Scene.role('heading')),
      Scene.expect(Scene.role('doc-subtitle')).toContainText('clicks=1'),
    )
  })
})
