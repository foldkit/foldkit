import { Array, Option, Predicate, Schema, SchemaAST } from 'effect'

type Comparison = boolean | 'Comparing'
type Comparisons = Map<SchemaAST.AST, Map<SchemaAST.AST, Comparison>>

const hasSameContext = (left: SchemaAST.AST, right: SchemaAST.AST): boolean =>
  (left.context?.isOptional ?? false) ===
    (right.context?.isOptional ?? false) &&
  (left.context?.isMutable ?? false) === (right.context?.isMutable ?? false)

const hasSameList = <Value>(
  left: ReadonlyArray<Value>,
  right: ReadonlyArray<Value>,
  isSame: (left: Value, right: Value) => boolean,
): boolean =>
  left.length === right.length &&
  Array.every(Array.zip(left, right), ([leftValue, rightValue]) =>
    isSame(leftValue, rightValue),
  )

const copyComparisons = (comparisons: Comparisons): Comparisons => {
  const copy: Comparisons = new Map()
  for (const [left, rightComparisons] of comparisons) {
    copy.set(left, new Map(rightComparisons))
  }

  return copy
}

const hasSameUnorderedList = <Value>(
  left: ReadonlyArray<Value>,
  right: ReadonlyArray<Value>,
  comparisons: Comparisons,
  isSame: (left: Value, right: Value, comparisons: Comparisons) => boolean,
): boolean =>
  Array.matchLeft(left, {
    onEmpty: () => Array.isArrayEmpty(Array.fromIterable(right)),
    onNonEmpty: (leftValue, remainingLeft) =>
      Option.match(
        Array.findFirstIndex(right, rightValue =>
          isSame(leftValue, rightValue, copyComparisons(comparisons)),
        ),
        {
          onNone: () => false,
          onSome: matchingIndex =>
            hasSameUnorderedList(
              remainingLeft,
              Array.remove(right, matchingIndex),
              comparisons,
              isSame,
            ),
        },
      ),
  })

const representationIdOf = (ast: SchemaAST.Declaration): unknown => {
  const representation = ast.annotations?.['representation']
  return Predicate.isObject(representation)
    ? Reflect.get(representation, 'id')
    : undefined
}

const comparisonOf = (
  comparisons: Comparisons,
  left: SchemaAST.AST,
  right: SchemaAST.AST,
): Comparison | undefined => comparisons.get(left)?.get(right)

const setComparison = (
  comparisons: Comparisons,
  left: SchemaAST.AST,
  right: SchemaAST.AST,
  comparison: Comparison,
): void => {
  const rightComparisons = comparisons.get(left)
  if (rightComparisons === undefined) {
    comparisons.set(left, new Map([[right, comparison]]))
  } else {
    rightComparisons.set(right, comparison)
  }
}

const compareDecodedAstShapes = (
  left: SchemaAST.AST,
  right: SchemaAST.AST,
  comparisons: Comparisons,
): boolean => {
  if (SchemaAST.isSuspend(left) || SchemaAST.isSuspend(right)) {
    if (!hasSameContext(left, right)) {
      return false
    }

    const leftType = SchemaAST.isSuspend(left) ? left.thunk() : left
    const rightType = SchemaAST.isSuspend(right) ? right.thunk() : right
    return hasSameDecodedAstShape(leftType, rightType, comparisons)
  }

  if (left._tag !== right._tag || !hasSameContext(left, right)) {
    return false
  }

  if (SchemaAST.isDeclaration(left) && SchemaAST.isDeclaration(right)) {
    const leftRepresentationId = representationIdOf(left)
    return (
      leftRepresentationId !== undefined &&
      leftRepresentationId === representationIdOf(right) &&
      hasSameList(
        left.typeParameters,
        right.typeParameters,
        (leftParameter, rightParameter) =>
          hasSameDecodedAstShape(leftParameter, rightParameter, comparisons),
      )
    )
  }

  if (SchemaAST.isLiteral(left) && SchemaAST.isLiteral(right)) {
    return Object.is(left.literal, right.literal)
  }

  if (SchemaAST.isUniqueSymbol(left) && SchemaAST.isUniqueSymbol(right)) {
    return left.symbol === right.symbol
  }

  if (SchemaAST.isEnum(left) && SchemaAST.isEnum(right)) {
    return hasSameUnorderedList(
      left.enums,
      right.enums,
      comparisons,
      (leftEntry, rightEntry) => {
        const [leftName, leftValue] = leftEntry
        const [rightName, rightValue] = rightEntry
        return leftName === rightName && Object.is(leftValue, rightValue)
      },
    )
  }

  if (SchemaAST.isTemplateLiteral(left) && SchemaAST.isTemplateLiteral(right)) {
    return hasSameList(left.parts, right.parts, (leftPart, rightPart) =>
      hasSameDecodedAstShape(leftPart, rightPart, comparisons),
    )
  }

  if (SchemaAST.isArrays(left) && SchemaAST.isArrays(right)) {
    return (
      left.isMutable === right.isMutable &&
      hasSameList(left.elements, right.elements, (leftElement, rightElement) =>
        hasSameDecodedAstShape(leftElement, rightElement, comparisons),
      ) &&
      hasSameList(left.rest, right.rest, (leftRest, rightRest) =>
        hasSameDecodedAstShape(leftRest, rightRest, comparisons),
      )
    )
  }

  if (SchemaAST.isObjects(left) && SchemaAST.isObjects(right)) {
    if (
      left.propertySignatures.length !== right.propertySignatures.length ||
      left.indexSignatures.length !== right.indexSignatures.length
    ) {
      return false
    }

    const rightProperties = new Map(
      Array.map(right.propertySignatures, property => [
        property.name,
        property.type,
      ]),
    )
    const hasSameProperties = Array.every(left.propertySignatures, property => {
      const rightType = rightProperties.get(property.name)
      return (
        rightType !== undefined &&
        hasSameDecodedAstShape(property.type, rightType, comparisons)
      )
    })

    return (
      hasSameProperties &&
      hasSameUnorderedList(
        left.indexSignatures,
        right.indexSignatures,
        comparisons,
        (leftIndex, rightIndex, indexComparisons) =>
          hasSameDecodedAstShape(
            leftIndex.parameter,
            rightIndex.parameter,
            indexComparisons,
          ) &&
          hasSameDecodedAstShape(
            leftIndex.type,
            rightIndex.type,
            indexComparisons,
          ),
      )
    )
  }

  if (SchemaAST.isUnion(left) && SchemaAST.isUnion(right)) {
    return (
      (left.options?.mode ?? 'anyOf') === (right.options?.mode ?? 'anyOf') &&
      hasSameUnorderedList(
        left.types,
        right.types,
        comparisons,
        hasSameDecodedAstShape,
      )
    )
  }

  return true
}

const hasSameDecodedAstShape = (
  left: SchemaAST.AST,
  right: SchemaAST.AST,
  comparisons: Comparisons,
): boolean => {
  if (left === right) {
    return true
  }

  const cached = comparisonOf(comparisons, left, right)
  if (cached !== undefined) {
    return cached === 'Comparing' || cached
  }

  setComparison(comparisons, left, right, 'Comparing')
  const isSame = compareDecodedAstShapes(left, right, comparisons)
  setComparison(comparisons, left, right, isSame)
  return isSame
}

/** @internal Tests whether two Schemas expose the same decoded built-in AST
 * shape. Opaque Declarations without a stable representation identity match
 * only when they share the same decoded AST reference. */
export const hasSameDecodedSchemaShape = (
  left: unknown,
  right: unknown,
): boolean => {
  if (!Schema.isSchema(left) || !Schema.isSchema(right)) {
    return false
  }

  const leftType = SchemaAST.toType(left.ast)
  const rightType = SchemaAST.toType(right.ast)
  if (!Predicate.isObject(leftType) || !Predicate.isObject(rightType)) {
    return false
  }

  return hasSameDecodedAstShape(leftType, rightType, new Map())
}
