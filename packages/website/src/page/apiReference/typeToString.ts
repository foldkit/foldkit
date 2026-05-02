import { Array, Match as M, Option, pipe } from 'effect'

import type { TypeDocItem, TypeDocSignature, TypeDocType } from './typedoc'

const indent = (depth: number): string => '  '.repeat(depth)

const whenType = M.discriminator('type')

const objectLiteralToString = (
  maybeChildren: Option.Option<ReadonlyArray<TypeDocItem>>,
  depth: number,
): string =>
  pipe(
    maybeChildren,
    Option.filter(Array.isReadonlyArrayNonEmpty),
    Option.match({
      onNone: () => '{}',
      onSome: children =>
        pipe(
          children,
          Array.map(
            child =>
              `${indent(depth + 1)}${child.name}: ${typeToString(child.type, depth + 1)}`,
          ),
          Array.join('\n'),
          properties => `{\n${properties}\n${indent(depth)}}`,
        ),
    }),
  )

const callSignatureToString = (
  signature: TypeDocSignature,
  depth: number,
): string => {
  const parameters = Option.match(signature.parameters, {
    onNone: () => '',
    onSome: params =>
      pipe(
        params,
        Array.map(parameter => {
          const optionalSuffix = parameter.flags.isOptional ? '?' : ''
          return `${parameter.name}${optionalSuffix}: ${typeToString(parameter.type, depth)}`
        }),
        Array.join(', '),
      ),
  })
  return `(${parameters}) => ${typeToString(signature.type, depth)}`
}

const reflectionToString = (
  maybeDeclaration: Option.Option<TypeDocItem>,
  depth: number,
): string =>
  Option.match(maybeDeclaration, {
    onNone: () => '{}',
    onSome: item =>
      pipe(
        item.signatures,
        Option.flatMap(Array.head),
        Option.match({
          onNone: () => objectLiteralToString(item.children, depth),
          onSome: signature => callSignatureToString(signature, depth),
        }),
      ),
  })

const formatType = (type: TypeDocType, depth: number): string =>
  M.value(type).pipe(
    whenType('intrinsic', ({ name }) => name),
    whenType('literal', ({ value }) => JSON.stringify(value)),
    whenType('reference', ({ name, typeArguments }) =>
      pipe(
        Option.fromNullishOr(typeArguments),
        Option.filter(Array.isReadonlyArrayNonEmpty),
        Option.match({
          onNone: () => name,
          onSome: arguments_ =>
            `${name}<${pipe(
              arguments_,
              Array.map(argument => formatType(argument, depth)),
              Array.join(', '),
            )}>`,
        }),
      ),
    ),
    whenType(
      'array',
      ({ elementType }) => `Array<${formatType(elementType, depth)}>`,
    ),
    whenType(
      'rest',
      ({ elementType }) => `...${formatType(elementType, depth)}`,
    ),
    whenType('tuple', ({ elements }) => {
      const formatted = Array.map(elements, element =>
        formatType(element, depth),
      )
      const isMultiLine = Array.some(formatted, line => line.includes('\n'))

      return isMultiLine
        ? pipe(
            elements,
            Array.map(
              element =>
                `${indent(depth + 1)}${formatType(element, depth + 1)}`,
            ),
            Array.join(',\n'),
            joined => `[\n${joined}\n${indent(depth)}]`,
          )
        : `[${Array.join(formatted, ', ')}]`
    }),
    whenType('union', ({ types }) =>
      pipe(
        types,
        Array.map(member => formatType(member, depth)),
        Array.join(' | '),
      ),
    ),
    whenType('intersection', ({ types }) =>
      pipe(
        types,
        Array.map(member => formatType(member, depth)),
        Array.join(' & '),
      ),
    ),
    whenType('reflection', ({ declaration }) =>
      reflectionToString(declaration, depth),
    ),
    whenType(
      'typeOperator',
      ({ operator, target }) => `${operator} ${formatType(target, depth)}`,
    ),
    whenType(
      'query',
      ({ queryType }) => `typeof ${formatType(queryType, depth)}`,
    ),
    whenType(
      'indexedAccess',
      ({ objectType, indexType }) =>
        `${formatType(objectType, depth)}[${formatType(indexType, depth)}]`,
    ),
    whenType('conditional', ({ checkType, extendsType, trueType, falseType }) =>
      Array.join(
        [
          `${formatType(checkType, depth)} extends ${formatType(extendsType, depth)}`,
          `${indent(depth + 1)}? ${formatType(trueType, depth + 1)}`,
          `${indent(depth + 1)}: ${formatType(falseType, depth + 1)}`,
        ],
        '\n',
      ),
    ),
    whenType(
      'mapped',
      ({ parameter, parameterType, templateType, readonlyModifier }) => {
        const readonlyPrefix = readonlyModifier === '+' ? 'readonly ' : ''
        return `{\n${indent(depth + 1)}${readonlyPrefix}[${parameter} in ${formatType(parameterType, depth + 1)}]: ${formatType(templateType, depth + 1)}\n${indent(depth)}}`
      },
    ),
    whenType('inferred', ({ name }) => `infer ${name}`),
    whenType('predicate', 'unknown', () => 'unknown'),
    M.exhaustive,
  )

export const typeToString = (
  maybeType: Option.Option<TypeDocType>,
  depth = 0,
): string =>
  Option.match(maybeType, {
    onNone: () => 'unknown',
    onSome: type => formatType(type, depth),
  })

export const typeDefFromChildren = (
  maybeChildren: Option.Option<ReadonlyArray<TypeDocItem>>,
): string =>
  pipe(
    maybeChildren,
    Option.filter(Array.isReadonlyArrayNonEmpty),
    Option.match({
      onNone: () => 'unknown',
      onSome: items =>
        pipe(
          items,
          Array.map(child => `  ${child.name}: ${typeToString(child.type, 1)}`),
          Array.join('\n'),
          properties => `{\n${properties}\n}`,
        ),
    }),
  )
