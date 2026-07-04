import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noHandRolledAriaWidgetRoles } from '../../src/rules/no-hand-rolled-aria-widget-roles.ts'

const roleCall = (value: string) =>
  Testing.callOfMember('h', 'Role', [Testing.strLiteral(value)])

const run = (node: unknown) =>
  Testing.runRule(noHandRolledAriaWidgetRoles, 'CallExpression', node)

describe('no-hand-rolled-aria-widget-roles', () => {
  it("flags Role('dialog') and points at Ui.Dialog", () => {
    const result = run(roleCall('dialog'))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Ui.Dialog')
  })

  it("flags Role('menu') and points at Ui.Menu", () => {
    const result = run(roleCall('menu'))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Ui.Menu')
  })

  it("flags Role('listbox') and points at Ui.Listbox", () => {
    const result = run(roleCall('listbox'))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Ui.Listbox')
  })

  it("flags the bare Role('tablist') form and points at Ui.Tabs", () => {
    const result = run(
      Testing.callExpr('Role', [Testing.strLiteral('tablist')]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Ui.Tabs')
  })

  it("allows a non-widget Role('alert')", () => {
    const result = run(roleCall('alert'))

    expect(result).toHaveLength(0)
  })

  it("allows a non-widget Role('note')", () => {
    const result = run(roleCall('note'))

    expect(result).toHaveLength(0)
  })

  it('ignores non-Role calls', () => {
    const result = run(
      Testing.callOfMember('h', 'Class', [Testing.strLiteral('menu')]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores a Role call with a non-string argument', () => {
    const result = run(Testing.callOfMember('h', 'Role', [Testing.id('kind')]))

    expect(result).toHaveLength(0)
  })
})
