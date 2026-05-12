import { Array, Match as M, Option, Order, Predicate, pipe } from 'effect'

import type { TypeDocItem, TypeDocSignature, TypeDocType } from './typedoc'

const indent = (depth: number): string => '  '.repeat(depth)

const whenType = M.discriminator('type')

/** Map from a reflection fingerprint to the qualified type name to render in
 * its place. The fingerprint identifies a Schema-derived struct by its sorted
 * field names, so that inlined `typeof Model.Type` reflections in function
 * signatures collapse back to the `Module.Model` name a reader recognizes.
 * TypeDoc strips source positions from inlined reflections, so the fingerprint
 * cannot rely on file/line info that's only present on the original
 * declaration. */
export type NamedSchemas = ReadonlyMap<string, string>

const emptyNamedSchemas: NamedSchemas = new Map()

/** Fingerprint a struct-like reflection by its sorted field names joined with
 * `|`. Stable across TypeScript inlining of `typeof Model.Type` aliases. */
export const reflectionFingerprint = (
  children: ReadonlyArray<TypeDocItem>,
): string =>
  pipe(
    children,
    Array.map(({ name }) => name),
    Array.sort(Order.String),
    Array.join('|'),
  )

const objectLiteralToString = (
  maybeChildren: Option.Option<ReadonlyArray<TypeDocItem>>,
  depth: number,
  namedSchemas: NamedSchemas,
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
              `${indent(depth + 1)}${child.name}: ${typeToString(child.type, depth + 1, namedSchemas)}`,
          ),
          Array.join('\n'),
          properties => `{\n${properties}\n${indent(depth)}}`,
        ),
    }),
  )

const callSignatureToString = (
  signature: TypeDocSignature,
  depth: number,
  namedSchemas: NamedSchemas,
): string => {
  const parameters = Option.match(signature.parameters, {
    onNone: () => '',
    onSome: params =>
      pipe(
        params,
        Array.map(parameter => {
          const optionalSuffix = parameter.flags.isOptional ? '?' : ''
          return `${parameter.name}${optionalSuffix}: ${typeToString(parameter.type, depth, namedSchemas)}`
        }),
        Array.join(', '),
      ),
  })
  return `(${parameters}) => ${typeToString(signature.type, depth, namedSchemas)}`
}

const isEffectSchemaReference = (type: TypeDocType): boolean =>
  type.type === 'reference' &&
  Predicate.isObject(type.target) &&
  Predicate.isString(type.target.packagePath) &&
  type.target.packagePath.endsWith('Schema.ts')

const isSchemaEncodedChild = (child: TypeDocItem): boolean =>
  Option.exists(child.type, isEffectSchemaReference)

const isSchemaEncodedReflection = (
  children: ReadonlyArray<TypeDocItem>,
): boolean => Array.some(children, isSchemaEncodedChild)

const matchNamedSchema = (
  item: TypeDocItem,
  namedSchemas: NamedSchemas,
): Option.Option<string> =>
  pipe(
    item.children,
    Option.filter(Array.isReadonlyArrayNonEmpty),
    Option.filter(children => !isSchemaEncodedReflection(children)),
    Option.flatMap(children =>
      Option.fromNullishOr(namedSchemas.get(reflectionFingerprint(children))),
    ),
  )

const reflectionToString = (
  maybeDeclaration: Option.Option<TypeDocItem>,
  depth: number,
  namedSchemas: NamedSchemas,
): string =>
  Option.match(maybeDeclaration, {
    onNone: () => '{}',
    onSome: item =>
      Option.getOrElse(
        Option.firstSomeOf([
          pipe(
            item.signatures,
            Option.flatMap(Array.head),
            Option.map(signature =>
              callSignatureToString(signature, depth, namedSchemas),
            ),
          ),
          matchNamedSchema(item, namedSchemas),
        ]),
        () => objectLiteralToString(item.children, depth, namedSchemas),
      ),
  })

const formatType = (
  type: TypeDocType,
  depth: number,
  namedSchemas: NamedSchemas,
): string =>
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
              Array.map(argument => formatType(argument, depth, namedSchemas)),
              Array.join(', '),
            )}>`,
        }),
      ),
    ),
    whenType(
      'array',
      ({ elementType }) =>
        `Array<${formatType(elementType, depth, namedSchemas)}>`,
    ),
    whenType(
      'rest',
      ({ elementType }) => `...${formatType(elementType, depth, namedSchemas)}`,
    ),
    whenType('tuple', ({ elements }) => {
      const formatted = Array.map(elements, element =>
        formatType(element, depth, namedSchemas),
      )
      const isMultiLine = Array.some(formatted, line => line.includes('\n'))

      return isMultiLine
        ? pipe(
            elements,
            Array.map(
              element =>
                `${indent(depth + 1)}${formatType(element, depth + 1, namedSchemas)}`,
            ),
            Array.join(',\n'),
            joined => `[\n${joined}\n${indent(depth)}]`,
          )
        : `[${Array.join(formatted, ', ')}]`
    }),
    whenType('union', ({ types }) =>
      pipe(
        types,
        Array.map(member => formatType(member, depth, namedSchemas)),
        Array.join(' | '),
      ),
    ),
    whenType('intersection', ({ types }) =>
      pipe(
        types,
        Array.map(member => formatType(member, depth, namedSchemas)),
        Array.join(' & '),
      ),
    ),
    whenType('reflection', ({ declaration }) =>
      reflectionToString(declaration, depth, namedSchemas),
    ),
    whenType(
      'typeOperator',
      ({ operator, target }) =>
        `${operator} ${formatType(target, depth, namedSchemas)}`,
    ),
    whenType(
      'query',
      ({ queryType }) => `typeof ${formatType(queryType, depth, namedSchemas)}`,
    ),
    whenType(
      'indexedAccess',
      ({ objectType, indexType }) =>
        `${formatType(objectType, depth, namedSchemas)}[${formatType(indexType, depth, namedSchemas)}]`,
    ),
    whenType('conditional', ({ checkType, extendsType, trueType, falseType }) =>
      Array.join(
        [
          `${formatType(checkType, depth, namedSchemas)} extends ${formatType(extendsType, depth, namedSchemas)}`,
          `${indent(depth + 1)}? ${formatType(trueType, depth + 1, namedSchemas)}`,
          `${indent(depth + 1)}: ${formatType(falseType, depth + 1, namedSchemas)}`,
        ],
        '\n',
      ),
    ),
    whenType(
      'mapped',
      ({ parameter, parameterType, templateType, readonlyModifier }) => {
        const readonlyPrefix = readonlyModifier === '+' ? 'readonly ' : ''
        return `{\n${indent(depth + 1)}${readonlyPrefix}[${parameter} in ${formatType(parameterType, depth + 1, namedSchemas)}]: ${formatType(templateType, depth + 1, namedSchemas)}\n${indent(depth)}}`
      },
    ),
    whenType('inferred', ({ name }) => `infer ${name}`),
    whenType('predicate', 'unknown', () => 'unknown'),
    M.exhaustive,
  )

export const typeToString = (
  maybeType: Option.Option<TypeDocType>,
  depth = 0,
  namedSchemas: NamedSchemas = emptyNamedSchemas,
): string =>
  Option.match(maybeType, {
    onNone: () => 'unknown',
    onSome: type => formatType(type, depth, namedSchemas),
  })

export const typeDefFromChildren = (
  maybeChildren: Option.Option<ReadonlyArray<TypeDocItem>>,
  namedSchemas: NamedSchemas = emptyNamedSchemas,
): string =>
  pipe(
    maybeChildren,
    Option.filter(Array.isReadonlyArrayNonEmpty),
    Option.match({
      onNone: () => 'unknown',
      onSome: items =>
        pipe(
          items,
          Array.map(
            child =>
              `  ${child.name}: ${typeToString(child.type, 1, namedSchemas)}`,
          ),
          Array.join('\n'),
          properties => `{\n${properties}\n}`,
        ),
    }),
  )
