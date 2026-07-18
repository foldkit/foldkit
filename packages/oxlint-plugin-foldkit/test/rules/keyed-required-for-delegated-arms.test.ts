import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { keyedRequiredForDelegatedArms } from '../../src/rules/keyed-required-for-delegated-arms.ts'

const callExpression = (
  callee: unknown,
  callArguments: ReadonlyArray<unknown> = [],
) => ({
  type: 'CallExpression',
  callee,
  arguments: callArguments,
})

const arrayExpression = (elements: ReadonlyArray<unknown>) => ({
  type: 'ArrayExpression',
  elements,
})

const nullLiteral = () => ({ type: 'Literal', value: null })

const conditionalExpression = (
  test: unknown,
  consequent: unknown,
  alternate: unknown,
) => ({
  type: 'ConditionalExpression',
  test,
  consequent,
  alternate,
})

const memberExpressionOf = (object: unknown, propertyName: string) => ({
  type: 'MemberExpression',
  object,
  property: Testing.id(propertyName),
  computed: false,
})

const elementCall = (tagName: string, children: ReadonlyArray<unknown> = []) =>
  Testing.callOfMember('h', tagName, [
    arrayExpression([]),
    arrayExpression(children),
  ])

const emptyHtml = () => Testing.memberExpr('h', 'empty')

const keyedCall = (keyNode: unknown, children: ReadonlyArray<unknown>) =>
  callExpression(
    Testing.callOfMember('h', 'keyed', [Testing.strLiteral('div')]),
    [keyNode, arrayExpression([]), arrayExpression(children)],
  )

const routeTag = memberExpressionOf(
  Testing.memberExpr('model', 'route'),
  '_tag',
)

const delegatedRouteMatch = () => {
  const homeArm = Testing.callExpr('homeView', [Testing.id('model')])
  const aboutArm = Testing.callExpr('aboutView', [Testing.id('model')])
  const matchCall = Testing.callOfMember('M', 'tagsExhaustive', [
    Testing.objectExpr([
      { key: 'Home', value: Testing.arrowFn(homeArm) },
      { key: 'About', value: Testing.arrowFn(aboutArm) },
    ]),
  ])
  return { matchCall, homeArm, aboutArm }
}

const pipedFromMatchValue = (matchCall: unknown) =>
  callExpression(
    memberExpressionOf(
      Testing.callOfMember('M', 'value', [
        Testing.memberExpr('model', 'route'),
      ]),
      'pipe',
    ),
    [matchCall],
  )

const runRule = (programNode: unknown) =>
  Testing.runRule(keyedRequiredForDelegatedArms, 'Program:exit', programNode)

describe('keyed-required-for-delegated-arms', () => {
  it('flags each delegated arm of a route match used unkeyed through a variable', () => {
    const { matchCall, homeArm, aboutArm } = delegatedRouteMatch()
    const viewFunction = Testing.arrowFn(
      Testing.blockStmt([
        Testing.varDecl(
          'const',
          'routeContent',
          pipedFromMatchValue(matchCall),
        ),
        Testing.returnStmt(elementCall('div', [Testing.id('routeContent')])),
      ]),
      [Testing.id('model')],
    )
    const programNode = Testing.program([
      Testing.varDecl('const', 'view', viewFunction),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(2)
    expect(result[0]?.diagnostic.node).toBe(homeArm)
    expect(result[1]?.diagnostic.node).toBe(aboutArm)
  })

  it('allows the variable form when the variable renders inside a keyed wrapper', () => {
    const { matchCall } = delegatedRouteMatch()
    const viewFunction = Testing.arrowFn(
      Testing.blockStmt([
        Testing.varDecl(
          'const',
          'routeContent',
          pipedFromMatchValue(matchCall),
        ),
        Testing.returnStmt(
          elementCall('main', [
            keyedCall(routeTag, [Testing.id('routeContent')]),
          ]),
        ),
      ]),
      [Testing.id('model')],
    )
    const programNode = Testing.program([
      Testing.varDecl('const', 'view', viewFunction),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })

  it('allows a match nested directly inside the children of a keyed call', () => {
    const { matchCall } = delegatedRouteMatch()
    const programNode = Testing.program([
      Testing.exprStmt(keyedCall(routeTag, [pipedFromMatchValue(matchCall)])),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })

  it('allows a delegated arm next to a direct element arm', () => {
    const detailArm = Testing.callExpr('detailView', [Testing.id('model')])
    const programNode = Testing.program([
      Testing.exprStmt(
        elementCall('section', [
          conditionalExpression(
            Testing.id('isDetail'),
            elementCall('div'),
            detailArm,
          ),
        ]),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })

  it('allows a mixed ternary whose delegated arm is wrapped in keyed', () => {
    const detailArm = Testing.callExpr('detailView', [Testing.id('model')])
    const programNode = Testing.program([
      Testing.exprStmt(
        conditionalExpression(
          Testing.id('isDetail'),
          elementCall('div'),
          keyedCall(Testing.strLiteral('detail'), [detailArm]),
        ),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })

  it('flags both arms of a delegated ternary placed in an unkeyed children array', () => {
    const summaryArm = Testing.callExpr('summaryView', [Testing.id('model')])
    const detailArm = Testing.callExpr('detailView', [Testing.id('model')])
    const programNode = Testing.program([
      Testing.exprStmt(
        elementCall('section', [
          conditionalExpression(Testing.id('isDetail'), summaryArm, detailArm),
        ]),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(2)
    expect(result[0]?.diagnostic.node).toBe(summaryArm)
    expect(result[1]?.diagnostic.node).toBe(detailArm)
  })

  it('allows a ternary of two non-view calls with no Html evidence', () => {
    const priceConditional = conditionalExpression(
      Testing.id('hasDiscount'),
      Testing.callExpr('priceOf', [Testing.id('discounted')]),
      Testing.callExpr('priceOf', [Testing.id('full')]),
    )
    const programNode = Testing.program([
      Testing.varDecl('const', 'price', priceConditional),
      Testing.exprStmt(
        Testing.binaryExpr('+', Testing.id('price'), Testing.numLiteral(1)),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })

  it('flags a delegated member call arm next to an h.empty absence arm', () => {
    const waitingArm = callExpression(Testing.memberExpr('Waiting', 'view'), [
      Testing.id('model'),
    ])
    const programNode = Testing.program([
      Testing.exprStmt(
        conditionalExpression(Testing.id('isWaiting'), waitingArm, emptyHtml()),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.node).toBe(waitingArm)
    expect(result[0]?.diagnostic.message).toContain('Waiting.view')
  })

  it('flags a delegated arm against null or undefined in a children array', () => {
    const detailArm = Testing.callExpr('detailView', [Testing.id('model')])
    const nullProgram = Testing.program([
      Testing.exprStmt(
        elementCall('section', [
          conditionalExpression(
            Testing.id('isDetail'),
            detailArm,
            nullLiteral(),
          ),
        ]),
      ),
    ])
    const undefinedArm = Testing.callExpr('detailView', [Testing.id('model')])
    const undefinedProgram = Testing.program([
      Testing.exprStmt(
        elementCall('section', [
          conditionalExpression(
            Testing.id('isDetail'),
            undefinedArm,
            Testing.id('undefined'),
          ),
        ]),
      ),
    ])

    const nullResult = runRule(nullProgram)
    const undefinedResult = runRule(undefinedProgram)

    expect(nullResult).toHaveLength(1)
    expect(nullResult[0]?.diagnostic.node).toBe(detailArm)
    expect(undefinedResult).toHaveLength(1)
    expect(undefinedResult[0]?.diagnostic.node).toBe(undefinedArm)
  })

  it('allows a delegated arm against null with no Html evidence', () => {
    const contentConditional = conditionalExpression(
      Testing.id('isDetail'),
      Testing.callExpr('detailView', [Testing.id('model')]),
      nullLiteral(),
    )
    const programNode = Testing.program([
      Testing.varDecl('const', 'content', contentConditional),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })

  it('allows conditionals whose arms are all element constructions', () => {
    const ternaryProgram = Testing.program([
      Testing.exprStmt(
        conditionalExpression(
          Testing.id('isOpen'),
          elementCall('div'),
          elementCall('span'),
        ),
      ),
    ])
    const matchProgram = Testing.program([
      Testing.exprStmt(
        Testing.callOfMember('M', 'tagsExhaustive', [
          Testing.objectExpr([
            { key: 'Open', value: Testing.arrowFn(elementCall('div')) },
            { key: 'Closed', value: Testing.arrowFn(elementCall('span')) },
          ]),
        ]),
      ),
    ])

    expect(runRule(ternaryProgram)).toHaveLength(0)
    expect(runRule(matchProgram)).toHaveLength(0)
  })

  it('flags the delegated handler of an Option.match with an h.empty handler', () => {
    const userCardArm = Testing.callExpr('userCard', [Testing.id('user')])
    const programNode = Testing.program([
      Testing.exprStmt(
        Testing.callOfMember('Option', 'match', [
          Testing.id('maybeUser'),
          Testing.objectExpr([
            { key: 'onNone', value: Testing.arrowFn(emptyHtml()) },
            {
              key: 'onSome',
              value: Testing.arrowFn(userCardArm, [Testing.id('user')]),
            },
          ]),
        ]),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.node).toBe(userCardArm)
  })

  it('allows the delegated handler of an Option.match when the other handler is an element', () => {
    const userCardArm = Testing.callExpr('userCard', [Testing.id('user')])
    const programNode = Testing.program([
      Testing.exprStmt(
        Testing.callOfMember('Option', 'match', [
          Testing.id('maybeUser'),
          Testing.objectExpr([
            { key: 'onNone', value: Testing.arrowFn(elementCall('div')) },
            {
              key: 'onSome',
              value: Testing.arrowFn(userCardArm, [Testing.id('user')]),
            },
          ]),
        ]),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })

  it('names the suppression id and the keyed wrapper in the message', () => {
    const detailArm = Testing.callExpr('detailView', [Testing.id('model')])
    const programNode = Testing.program([
      Testing.exprStmt(
        conditionalExpression(Testing.id('isDetail'), detailArm, emptyHtml()),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('keyed')
    expect(result[0]?.diagnostic.message).toContain(
      'foldkit/keyed-required-for-delegated-arms',
    )
  })

  it('flags a delegated arm returned from a block-bodied handler', () => {
    const homeArm = Testing.callExpr('homeView', [Testing.id('model')])
    const programNode = Testing.program([
      Testing.exprStmt(
        Testing.callOfMember('M', 'tagsExhaustive', [
          Testing.objectExpr([
            {
              key: 'Home',
              value: Testing.arrowFn(
                Testing.blockStmt([Testing.returnStmt(homeArm)]),
              ),
            },
            { key: 'Hidden', value: Testing.arrowFn(emptyHtml()) },
          ]),
        ]),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.node).toBe(homeArm)
  })

  it('treats a delegated call that threads a Key attribute as keyed', () => {
    const keyedPanelArm = callExpression(Testing.memberExpr('Panel', 'view'), [
      arrayExpression([
        Testing.callOfMember('h', 'Key', [Testing.strLiteral('panel')]),
      ]),
      Testing.id('model'),
    ])
    const keyedProgram = Testing.program([
      Testing.exprStmt(
        conditionalExpression(Testing.id('isOpen'), keyedPanelArm, emptyHtml()),
      ),
    ])
    const unkeyedPanelArm = callExpression(
      Testing.memberExpr('Panel', 'view'),
      [arrayExpression([]), Testing.id('model')],
    )
    const unkeyedProgram = Testing.program([
      Testing.exprStmt(
        conditionalExpression(
          Testing.id('isOpen'),
          unkeyedPanelArm,
          emptyHtml(),
        ),
      ),
    ])

    const keyedResult = runRule(keyedProgram)
    const unkeyedResult = runRule(unkeyedProgram)

    expect(keyedResult).toHaveLength(0)
    expect(unkeyedResult).toHaveLength(1)
    expect(unkeyedResult[0]?.diagnostic.node).toBe(unkeyedPanelArm)
  })

  it('treats a bare tag-name call as protective element construction', () => {
    const detailArm = Testing.callExpr('detailView', [Testing.id('model')])
    const bareDivArm = Testing.callExpr('div', [
      arrayExpression([]),
      arrayExpression([]),
    ])
    const programNode = Testing.program([
      Testing.exprStmt(
        elementCall('section', [
          conditionalExpression(Testing.id('isDetail'), bareDivArm, detailArm),
        ]),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })

  it('treats a bare lowercase non-tag call as delegated', () => {
    const spinnerArm = Testing.callExpr('spinner')
    const detailArm = Testing.callExpr('detailView', [Testing.id('model')])
    const programNode = Testing.program([
      Testing.exprStmt(
        elementCall('section', [
          conditionalExpression(Testing.id('isDetail'), spinnerArm, detailArm),
        ]),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(2)
  })

  it('treats a pipe arm as neither hazard nor protection', () => {
    const routePushArm = Testing.callOfMember('Route', 'push', [
      Testing.id('href'),
    ])
    const programNode = Testing.program([
      Testing.exprStmt(
        elementCall('section', [
          Testing.callOfMember('M', 'tagsExhaustive', [
            Testing.objectExpr([
              {
                key: 'Internal',
                value: Testing.arrowFn(
                  callExpression(
                    memberExpressionOf(
                      Testing.callOfMember('M', 'value', [
                        Testing.id('request'),
                      ]),
                      'pipe',
                    ),
                    [Testing.id('withUpdateReturn')],
                  ),
                ),
              },
              { key: 'External', value: Testing.arrowFn(routePushArm) },
            ]),
          ]),
        ]),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })

  it('treats a nested match arm as neither hazard nor protection', () => {
    const homeArm = Testing.callExpr('homeView', [Testing.id('model')])
    const programNode = Testing.program([
      Testing.exprStmt(
        elementCall('section', [
          Testing.callOfMember('M', 'tagsExhaustive', [
            Testing.objectExpr([
              {
                key: 'Detail',
                value: Testing.arrowFn(
                  Testing.callOfMember('Option', 'match', [
                    Testing.id('maybeItem'),
                    Testing.objectExpr([
                      {
                        key: 'onNone',
                        value: Testing.arrowFn(elementCall('div')),
                      },
                      {
                        key: 'onSome',
                        value: Testing.arrowFn(elementCall('span')),
                      },
                    ]),
                  ]),
                ),
              },
              { key: 'Home', value: Testing.arrowFn(homeArm) },
            ]),
          ]),
        ]),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })

  it('allows two delegated lowercase calls with no Html evidence', () => {
    const programNode = Testing.program([
      Testing.exprStmt(
        Testing.callOfMember('Option', 'match', [
          Testing.id('maybeRoute'),
          Testing.objectExpr([
            { key: 'onNone', value: Testing.arrowFn(Testing.callExpr('init')) },
            {
              key: 'onSome',
              value: Testing.arrowFn(
                Testing.callOfMember('Home', 'boot', [Testing.id('route')]),
                [Testing.id('route')],
              ),
            },
          ]),
        ]),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })

  it('allows an update-shaped match with delegated command arms and no Html evidence', () => {
    const commandsMatch = pipedFromMatchValue(
      Testing.callOfMember('M', 'tagsExhaustive', [
        Testing.objectExpr([
          {
            key: 'Home',
            value: Testing.arrowFn(
              Testing.callOfMember('Command', 'mapMessages', [
                Testing.id('homeCommands'),
              ]),
            ),
          },
          { key: 'NotFound', value: Testing.arrowFn(arrayExpression([])) },
        ]),
      ]),
    )
    const initFunction = Testing.arrowFn(
      Testing.blockStmt([
        Testing.varDecl('const', 'commands', commandsMatch),
        Testing.returnStmt(
          arrayExpression([Testing.id('model'), Testing.id('commands')]),
        ),
      ]),
      [Testing.id('url')],
    )
    const programNode = Testing.program([
      Testing.varDecl('const', 'init', initFunction),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })

  it('allows a ternary of a non-h empty member against a tagged $match', () => {
    const progressMatch = Testing.callOfMember(
      'PlayerProgressAction',
      '$match',
      [
        Testing.id('progressAction'),
        Testing.objectExpr([
          {
            key: 'Clear',
            value: Testing.arrowFn(Testing.memberExpr('Str', 'empty')),
          },
          {
            key: 'Maintain',
            value: Testing.arrowFn(Testing.id('userGameText'), [
              Testing.id('userGameText'),
            ]),
          },
        ]),
      ],
    )
    const programNode = Testing.program([
      Testing.varDecl(
        'const',
        'nextUserGameText',
        conditionalExpression(
          Testing.id('gameJustStarted'),
          Testing.memberExpr('Str', 'empty'),
          progressMatch,
        ),
      ),
    ])

    const result = runRule(programNode)

    expect(result).toHaveLength(0)
  })
})
