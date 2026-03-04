import type { Validation } from 'foldkit/fieldValidation'

const noConsecutiveSpaces: Validation<string> = [
  value => !/  /.test(value),
  'Cannot contain consecutive spaces',
]

const divisibleBy = (divisor: number): Validation<number> => [
  value => value % divisor === 0,
  value => `${value} is not divisible by ${divisor}`,
]
