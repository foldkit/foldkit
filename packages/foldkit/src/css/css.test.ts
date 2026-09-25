import { describe, expect, it } from 'vitest'

import * as Css from './css.js'

describe('unit functions', () => {
  it('appends each unit suffix to the formatted number', () => {
    expect(Css.number(12)).toBe('12')
    expect(Css.percent(12)).toBe('12%')
    expect(Css.px(12)).toBe('12px')
    expect(Css.em(12)).toBe('12em')
    expect(Css.rem(12)).toBe('12rem')
    expect(Css.ch(12)).toBe('12ch')
    expect(Css.vw(12)).toBe('12vw')
    expect(Css.vh(12)).toBe('12vh')
    expect(Css.vmin(12)).toBe('12vmin')
    expect(Css.vmax(12)).toBe('12vmax')
    expect(Css.fr(12)).toBe('12fr')
    expect(Css.deg(12)).toBe('12deg')
    expect(Css.rad(12)).toBe('12rad')
    expect(Css.turn(12)).toBe('12turn')
    expect(Css.s(12)).toBe('12s')
    expect(Css.ms(12)).toBe('12ms')
  })
})

describe('format', () => {
  it('keeps at most four decimal places and removes floating-point noise', () => {
    expect(Css.number(0.45999999999999996)).toBe('0.46')
    expect(Css.number(0.30000000000000004)).toBe('0.3')
    expect(Css.number(33.333333333333336)).toBe('33.3333')
    expect(Css.number(-1.2855752193730785)).toBe('-1.2856')
    expect(Css.number(1.00005)).toBe('1.0001')
    expect(Css.number(2)).toBe('2')
  })

  it('writes negative zero and values that round to zero as 0', () => {
    expect(Css.number(-0)).toBe('0')
    expect(Css.number(-0.00001)).toBe('0')
    expect(Css.number(1e-7)).toBe('0')
  })

  it('keeps exponent form only for magnitudes of at least 1e21', () => {
    expect(Css.number(1e21)).toBe('1e+21')
  })

  it('formats the same with no options, empty options, or an undefined step', () => {
    const values = [12, 0.45999999999999996, 33.333333333333336, -0, 1e21]

    for (const value of values) {
      expect(Css.px(value, {})).toBe(Css.px(value))
      // @ts-expect-error exactOptionalPropertyTypes rejects an explicit undefined step
      expect(Css.px(value, { step: undefined })).toBe(Css.px(value))
    }
  })
})

describe('non-finite values', () => {
  it('throws for NaN, Infinity, and -Infinity with the function name and value', () => {
    expect(() => Css.px(NaN)).toThrow(
      new Error(
        '[foldkit] Css.px received NaN. CSS numeric values must be finite.',
      ),
    )
    expect(() => Css.px(Infinity)).toThrow(
      new Error(
        '[foldkit] Css.px received Infinity. CSS numeric values must be finite.',
      ),
    )
    expect(() => Css.number(-Infinity)).toThrow(
      new Error(
        '[foldkit] Css.number received -Infinity. CSS numeric values must be finite.',
      ),
    )
    expect(() => Css.number(NaN)).toThrow(
      new Error(
        '[foldkit] Css.number received NaN. CSS numeric values must be finite.',
      ),
    )
  })
})

describe('step', () => {
  it('rounds to the nearest multiple of the step before formatting', () => {
    expect(Css.number(0.33, { step: 0.1 })).toBe('0.3')
    expect(Css.number(0.7, { step: 0.1 })).toBe('0.7')
    expect(Css.number(6.3, { step: 0.5 })).toBe('6.5')
    expect(Css.number(6.2, { step: 0.5 })).toBe('6')
    expect(Css.number(7, { step: 3 })).toBe('6')
    expect(Css.px(0.4312, { step: 0.01 })).toBe('0.43px')
  })

  it('rounds a value halfway between two multiples toward positive infinity', () => {
    expect(Css.number(0.25, { step: 0.5 })).toBe('0.5')
    expect(Css.number(-0.25, { step: 0.5 })).toBe('0')
  })

  it('ends in the four-decimal format when the step is finer', () => {
    expect(Css.number(1.23456789, { step: 0.00001 })).toBe('1.2346')
  })

  it('throws for a step that is not a finite number greater than 0', () => {
    expect(() => Css.number(1, { step: 0 })).toThrow(
      new Error(
        '[foldkit] Css.number received step 0. A step must be a finite number greater than 0.',
      ),
    )
    expect(() => Css.number(1, { step: -1 })).toThrow(
      new Error(
        '[foldkit] Css.number received step -1. A step must be a finite number greater than 0.',
      ),
    )
    expect(() => Css.px(1, { step: NaN })).toThrow(
      new Error(
        '[foldkit] Css.px received step NaN. A step must be a finite number greater than 0.',
      ),
    )
    expect(() => Css.px(1, { step: Infinity })).toThrow(
      new Error(
        '[foldkit] Css.px received step Infinity. A step must be a finite number greater than 0.',
      ),
    )
  })

  it('throws when the rounded value is not finite', () => {
    expect(() => Css.number(1e300, { step: 1e-10 })).toThrow(
      new Error(
        '[foldkit] Css.number cannot round 1e+300 to step 1e-10. The rounded value is not finite.',
      ),
    )
  })
})
