import { describe, it } from '@effect/vitest'
import { Option, Schema as S } from 'effect'
import { expect } from 'vitest'

import {
  Field,
  Invalid,
  NotValidated,
  type Rule,
  Valid,
  Validating,
  allValid,
  anyInvalid,
  email,
  endsWith,
  equals,
  includes,
  isInvalid,
  isRequired,
  isValid,
  makeRules,
  maxLength,
  minLength,
  oneOf,
  pattern,
  resolveMessage,
  startsWith,
  url,
  validate,
  validateAll,
} from './index.js'

describe('state constructors', () => {
  it('build tagged instances for each state', () => {
    expect(NotValidated({ value: 'x' })._tag).toBe('NotValidated')
    expect(Validating({ value: 'x' })._tag).toBe('Validating')
    expect(Valid({ value: 'x' })._tag).toBe('Valid')
    expect(Invalid({ value: 'x', errors: ['bad'] })._tag).toBe('Invalid')
  })
})

describe('Field schema', () => {
  it('decodes each variant', () => {
    const decoded = S.decodeUnknownOption(Field)({
      _tag: 'NotValidated',
      value: 'hi',
    })
    expect(Option.isSome(decoded)).toBe(true)
  })

  it('rejects unknown tags', () => {
    const decoded = S.decodeUnknownOption(Field)({
      _tag: 'Unknown',
      value: 'hi',
    })
    expect(Option.isNone(decoded)).toBe(true)
  })
})

describe('makeRules', () => {
  it('creates a rules bundle with defaults for omitted options', () => {
    const rules = makeRules()
    expect(isRequired(rules)).toBe(false)
    expect(rules.rules).toHaveLength(0)
    expect(rules.isEmpty('')).toBe(true)
    expect(rules.isEmpty(' ')).toBe(false)
  })

  it('accepts required, rules, and isEmpty', () => {
    const emailRules = makeRules({
      required: 'Email is required',
      rules: [email('Invalid')],
    })
    expect(isRequired(emailRules)).toBe(true)
    expect(emailRules.rules).toHaveLength(1)
  })

  it('accepts a custom isEmpty predicate', () => {
    const trimmedRules = makeRules({
      required: 'Required',
      isEmpty: value => value.trim() === '',
    })
    expect(trimmedRules.isEmpty(' ')).toBe(true)
    expect(trimmedRules.isEmpty('x')).toBe(false)
  })
})

describe('isRequired', () => {
  it('returns true when required is passed', () => {
    expect(isRequired(makeRules({ required: 'Required' }))).toBe(true)
  })

  it('returns false when required is omitted', () => {
    expect(isRequired(makeRules())).toBe(false)
  })
})

describe('validate', () => {
  describe('required field', () => {
    const rules = makeRules({
      required: 'First name is required',
      rules: [minLength(2, 'Must be at least 2 characters')],
    })

    it('returns Invalid with required message for empty value', () => {
      const state = validate(rules)('')
      expect(state._tag).toBe('Invalid')
      if (state._tag === 'Invalid') {
        expect(state.errors).toEqual(['First name is required'])
      }
    })

    it('returns Invalid with rule error for non-empty-but-failing value', () => {
      const state = validate(rules)('a')
      expect(state._tag).toBe('Invalid')
      if (state._tag === 'Invalid') {
        expect(state.errors).toEqual(['Must be at least 2 characters'])
      }
    })

    it('returns Valid for value that passes rules', () => {
      const state = validate(rules)('Alex')
      expect(state._tag).toBe('Valid')
    })
  })

  describe('optional field', () => {
    const rules = makeRules({
      rules: [email('Please enter a valid email')],
    })

    it('returns NotValidated for empty value', () => {
      const state = validate(rules)('')
      expect(state._tag).toBe('NotValidated')
    })

    it('returns Invalid for non-empty-but-failing value', () => {
      const state = validate(rules)('not-an-email')
      expect(state._tag).toBe('Invalid')
      if (state._tag === 'Invalid') {
        expect(state.errors).toEqual(['Please enter a valid email'])
      }
    })

    it('returns Valid for value that passes rules', () => {
      const state = validate(rules)('jane@example.com')
      expect(state._tag).toBe('Valid')
    })
  })

  describe('field with no rules', () => {
    const requiredRules = makeRules({ required: 'Required' })
    const optionalRules = makeRules()

    it('required: empty produces Invalid with required message', () => {
      const state = validate(requiredRules)('')
      expect(state._tag).toBe('Invalid')
    })

    it('required: any non-empty value is Valid', () => {
      const state = validate(requiredRules)('anything')
      expect(state._tag).toBe('Valid')
    })

    it('optional: empty produces NotValidated', () => {
      const state = validate(optionalRules)('')
      expect(state._tag).toBe('NotValidated')
    })

    it('optional: any non-empty value is Valid', () => {
      const state = validate(optionalRules)('anything')
      expect(state._tag).toBe('Valid')
    })
  })
})

describe('validateAll', () => {
  const rules = makeRules({
    rules: [
      minLength(5, 'Must be at least 5 characters'),
      pattern(/\d/, 'Must contain a digit'),
    ],
  })

  it('collects every failing rule into the Invalid errors', () => {
    const state = validateAll(rules)('ab')
    expect(state._tag).toBe('Invalid')
    if (state._tag === 'Invalid') {
      expect(state.errors).toEqual([
        'Must be at least 5 characters',
        'Must contain a digit',
      ])
    }
  })

  it('returns Valid when every rule passes', () => {
    const state = validateAll(rules)('abc123')
    expect(state._tag).toBe('Valid')
  })

  it('returns NotValidated for optional empty value', () => {
    const state = validateAll(rules)('')
    expect(state._tag).toBe('NotValidated')
  })
})

describe('isValid', () => {
  const requiredRules = makeRules({ required: 'Required' })
  const optionalRules = makeRules()

  it('required: Valid → true', () => {
    expect(isValid(requiredRules)(Valid({ value: 'x' }))).toBe(true)
  })

  it('required: NotValidated → false', () => {
    expect(isValid(requiredRules)(NotValidated({ value: '' }))).toBe(false)
  })

  it('required: Invalid → false', () => {
    expect(
      isValid(requiredRules)(Invalid({ value: '', errors: ['bad'] })),
    ).toBe(false)
  })

  it('required: Validating → false', () => {
    expect(isValid(requiredRules)(Validating({ value: 'x' }))).toBe(false)
  })

  it('optional: Valid → true', () => {
    expect(isValid(optionalRules)(Valid({ value: 'x' }))).toBe(true)
  })

  it('optional: NotValidated → true', () => {
    expect(isValid(optionalRules)(NotValidated({ value: '' }))).toBe(true)
  })

  it('optional: Invalid → false', () => {
    expect(
      isValid(optionalRules)(Invalid({ value: 'x', errors: ['bad'] })),
    ).toBe(false)
  })

  it('optional: Validating → false', () => {
    expect(isValid(optionalRules)(Validating({ value: 'x' }))).toBe(false)
  })
})

describe('allValid', () => {
  const requiredRules = makeRules({ required: 'Required' })
  const optionalRules = makeRules()

  it('returns true when every pair is acceptable', () => {
    expect(
      allValid([
        [Valid({ value: 'a' }), requiredRules],
        [NotValidated({ value: '' }), optionalRules],
      ]),
    ).toBe(true)
  })

  it('returns false when any pair is not acceptable', () => {
    expect(
      allValid([
        [Valid({ value: 'a' }), requiredRules],
        [Invalid({ value: 'x', errors: ['bad'] }), optionalRules],
      ]),
    ).toBe(false)
  })

  it('returns true for an empty input (vacuously)', () => {
    expect(allValid([])).toBe(true)
  })
})

describe('isInvalid', () => {
  it('returns true for Invalid', () => {
    expect(isInvalid(Invalid({ value: 'x', errors: ['bad'] }))).toBe(true)
  })

  it('returns false for Valid', () => {
    expect(isInvalid(Valid({ value: 'x' }))).toBe(false)
  })

  it('returns false for NotValidated', () => {
    expect(isInvalid(NotValidated({ value: '' }))).toBe(false)
  })

  it('returns false for Validating', () => {
    expect(isInvalid(Validating({ value: 'x' }))).toBe(false)
  })
})

describe('anyInvalid', () => {
  it('returns true when any state is Invalid', () => {
    expect(
      anyInvalid([
        Valid({ value: 'a' }),
        Invalid({ value: 'b', errors: ['bad'] }),
        NotValidated({ value: '' }),
      ]),
    ).toBe(true)
  })

  it('returns false when no state is Invalid', () => {
    expect(
      anyInvalid([
        Valid({ value: 'a' }),
        NotValidated({ value: '' }),
        Validating({ value: 'x' }),
      ]),
    ).toBe(false)
  })

  it('returns false for an empty input', () => {
    expect(anyInvalid([])).toBe(false)
  })
})

describe('string rules', () => {
  describe('minLength', () => {
    it('fails below minimum', () => {
      const [predicate] = minLength(3)
      expect(predicate('ab')).toBe(false)
    })

    it('passes at minimum', () => {
      const [predicate] = minLength(3)
      expect(predicate('abc')).toBe(true)
    })

    it('accepts custom message', () => {
      const [, message] = minLength(3, 'Too short')
      expect(resolveMessage(message, '')).toBe('Too short')
    })
  })

  describe('maxLength', () => {
    it('fails above maximum', () => {
      const [predicate] = maxLength(5)
      expect(predicate('toolong')).toBe(false)
    })

    it('passes at maximum', () => {
      const [predicate] = maxLength(5)
      expect(predicate('hello')).toBe(true)
    })
  })

  describe('pattern', () => {
    const hexRegex = /^#[0-9a-f]{6}$/i

    it('fails for non-matching string', () => {
      const [predicate] = pattern(hexRegex)
      expect(predicate('red')).toBe(false)
    })

    it('passes for matching string', () => {
      const [predicate] = pattern(hexRegex)
      expect(predicate('#ff00aa')).toBe(true)
    })
  })

  describe('email', () => {
    it('fails for non-email string', () => {
      const [predicate] = email()
      expect(predicate('not-an-email')).toBe(false)
    })

    it('passes for valid email', () => {
      const [predicate] = email()
      expect(predicate('user@example.com')).toBe(true)
    })
  })

  describe('url', () => {
    it('passes for https URL by default', () => {
      const [predicate] = url()
      expect(predicate('https://example.com')).toBe(true)
    })

    it('rejects bare domains by default', () => {
      const [predicate] = url()
      expect(predicate('example.com')).toBe(false)
    })

    it('accepts bare domains when requireProtocol is false', () => {
      const [predicate] = url({ requireProtocol: false })
      expect(predicate('example.com')).toBe(true)
      expect(predicate('sub.example.co.uk/path')).toBe(true)
    })

    it('uses custom message', () => {
      const [, message] = url({ message: 'Enter a valid link' })
      expect(resolveMessage(message, '')).toBe('Enter a valid link')
    })
  })

  describe('startsWith / endsWith / includes / equals', () => {
    it('startsWith', () => {
      const [predicate] = startsWith('abc')
      expect(predicate('abcdef')).toBe(true)
      expect(predicate('xabcdef')).toBe(false)
    })

    it('endsWith', () => {
      const [predicate] = endsWith('xyz')
      expect(predicate('abcxyz')).toBe(true)
      expect(predicate('abcxyza')).toBe(false)
    })

    it('includes', () => {
      const [predicate] = includes('mid')
      expect(predicate('amiddle')).toBe(true)
      expect(predicate('start')).toBe(false)
    })

    it('equals', () => {
      const [predicate] = equals('exact')
      expect(predicate('exact')).toBe(true)
      expect(predicate('exactly')).toBe(false)
    })
  })
})

describe('oneOf', () => {
  it('passes when value is in the set', () => {
    const [predicate] = oneOf(['red', 'green', 'blue'])
    expect(predicate('green')).toBe(true)
  })

  it('fails when value is not in the set', () => {
    const [predicate] = oneOf(['red', 'green', 'blue'])
    expect(predicate('yellow')).toBe(false)
  })
})

describe('Rule type', () => {
  it('exists as an exported type', () => {
    const rule: Rule = [value => value.length > 0, 'Required']
    const [predicate] = rule
    expect(predicate('x')).toBe(true)
    expect(predicate('')).toBe(false)
  })
})
