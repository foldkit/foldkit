import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { gotPrefixRequiresSubmodelPayload } from '../../src/rules/got-prefix-requires-submodel-payload.ts'

const m = (tag: string, fields?: unknown) =>
  Testing.callExpr(
    'm',
    fields === undefined
      ? [Testing.strLiteral(tag)]
      : [Testing.strLiteral(tag), fields],
  )

describe('got-prefix-requires-submodel-payload', () => {
  it('allows Got*Message wrappers whose Message schema is indirect', () => {
    const unknownPayload = Testing.runRule(
      gotPrefixRequiresSubmodelPayload,
      'CallExpression',
      m(
        'GotInspectorTabsMessage',
        Testing.objectExpr([
          { key: 'message', value: Testing.memberExpr('S', 'Unknown') },
        ]),
      ),
    )
    const suspendedPayload = Testing.runRule(
      gotPrefixRequiresSubmodelPayload,
      'CallExpression',
      m(
        'GotSliderMessage',
        Testing.objectExpr([
          {
            key: 'message',
            value: Testing.callOfMember('S', 'suspend', [
              Testing.arrowFn(Testing.memberExpr('Slider', 'Message')),
            ]),
          },
        ]),
      ),
    )

    expect(unknownPayload).toHaveLength(0)
    expect(suspendedPayload).toHaveLength(0)
  })

  it('reserves Got-prefixed Messages for Submodel wrappers', () => {
    const result = Testing.runRule(
      gotPrefixRequiresSubmodelPayload,
      'CallExpression',
      m('GotWeather', Testing.objectExpr([{ key: 'temperature' }])),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'reserved for Submodel wrappers',
    )
  })

  it('requires Got-prefixed Submodel wrappers to carry a Message payload', () => {
    const result = Testing.runRule(
      gotPrefixRequiresSubmodelPayload,
      'CallExpression',
      m('GotChildMessage', Testing.objectExpr([{ key: 'id' }])),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      '{ message: Child.Message }',
    )
  })
})
