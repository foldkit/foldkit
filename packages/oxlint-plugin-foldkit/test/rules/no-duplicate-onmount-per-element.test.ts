import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noDuplicateOnmountPerElement } from '../../src/rules/no-duplicate-onmount-per-element.ts'

const arrayExpression = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression',
  elements,
})

const onMountCall = (mountName: string) =>
  Testing.callExpr('OnMount', [Testing.id(mountName)])

const memberOnMountCall = (objectName: string, mountName: string) =>
  Testing.callOfMember(objectName, 'OnMount', [Testing.id(mountName)])

const chainedOnMountCall = (mountName: string) => ({
  type: 'CallExpression',
  callee: Testing.chainedMemberExpr('Foldkit', 'Html', 'OnMount'),
  arguments: [Testing.id(mountName)],
})

const computedOnMountCall = (mountName: string) => ({
  type: 'CallExpression',
  callee: Testing.computedMemberExpr('h', 'OnMount'),
  arguments: [Testing.id(mountName)],
})

describe('no-duplicate-onmount-per-element', () => {
  it('flags two bare OnMount calls in one attribute array', () => {
    const result = Testing.runRule(
      noDuplicateOnmountPerElement,
      'ArrayExpression',
      arrayExpression([
        onMountCall('AnchorPopover'),
        onMountCall('SyncScroll'),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'Only one OnMount attribute can attach',
    )
  })

  it('counts bare and member OnMount calls together', () => {
    const result = Testing.runRule(
      noDuplicateOnmountPerElement,
      'ArrayExpression',
      arrayExpression([
        onMountCall('AnchorPopover'),
        memberOnMountCall('h', 'SyncScroll'),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('counts deep member paths by their last segment', () => {
    const result = Testing.runRule(
      noDuplicateOnmountPerElement,
      'ArrayExpression',
      arrayExpression([
        memberOnMountCall('h', 'AnchorPopover'),
        chainedOnMountCall('SyncScroll'),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('reports once per array, not once per extra call', () => {
    const result = Testing.runRule(
      noDuplicateOnmountPerElement,
      'ArrayExpression',
      arrayExpression([
        onMountCall('AnchorPopover'),
        onMountCall('SyncScroll'),
        onMountCall('PortalBackdrop'),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('allows a single OnMount among other attributes', () => {
    const result = Testing.runRule(
      noDuplicateOnmountPerElement,
      'ArrayExpression',
      arrayExpression([
        Testing.callExpr('Class', [Testing.strLiteral('panel')]),
        onMountCall('AnchorPopover'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a conditional whose branches are OnMount calls', () => {
    const result = Testing.runRule(
      noDuplicateOnmountPerElement,
      'ArrayExpression',
      arrayExpression([
        {
          type: 'ConditionalExpression',
          test: Testing.id('condition'),
          consequent: onMountCall('AnchorPopover'),
          alternate: onMountCall('SyncScroll'),
        },
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('does not count OnMount calls nested inside another call', () => {
    const result = Testing.runRule(
      noDuplicateOnmountPerElement,
      'ArrayExpression',
      arrayExpression([
        Testing.callExpr('MaybeAttribute', [onMountCall('AnchorPopover')]),
        onMountCall('SyncScroll'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows arrays without any OnMount call', () => {
    const result = Testing.runRule(
      noDuplicateOnmountPerElement,
      'ArrayExpression',
      arrayExpression([
        Testing.callExpr('Class', [Testing.strLiteral('panel')]),
        Testing.callExpr('Id', [Testing.strLiteral('main')]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('does not count computed member callees ending in OnMount', () => {
    const result = Testing.runRule(
      noDuplicateOnmountPerElement,
      'ArrayExpression',
      arrayExpression([
        computedOnMountCall('AnchorPopover'),
        onMountCall('SyncScroll'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('skips array holes while counting', () => {
    const result = Testing.runRule(
      noDuplicateOnmountPerElement,
      'ArrayExpression',
      arrayExpression([
        null,
        onMountCall('AnchorPopover'),
        onMountCall('SyncScroll'),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('does not count spread elements', () => {
    const result = Testing.runRule(
      noDuplicateOnmountPerElement,
      'ArrayExpression',
      arrayExpression([
        { type: 'SpreadElement', argument: Testing.id('baseAttributes') },
        onMountCall('AnchorPopover'),
      ]),
    )

    expect(result).toHaveLength(0)
  })
})
