---
'foldkit': minor
---

Add named attribute builders for a broad set of SVG attributes that previously
worked only through `h.Attribute('text-anchor', 'middle')`. You can now write
`h.TextAnchor('middle')` and reach for the same named builders across text
positioning (`Dx`, `Dy`, `Rotate`, `TextAnchor`, `DominantBaseline`,
`AlignmentBaseline`, `BaselineShift`), text metrics and style (`TextLength`,
`LengthAdjust`, `FontFamily`, `FontSize`, `FontWeight`, `FontStyle`,
`LetterSpacing`, `WordSpacing`, `TextDecoration`, `WritingMode`), geometry
(`Rx`, `Ry`, `PathLength`), paint (`FillOpacity`, `StrokeOpacity`,
`StrokeMiterlimit`, `PaintOrder`, `VectorEffect`, `Color`), visibility
(`Visibility`, `Display`, `Overflow`, `PointerEvents`, `Cursor`), rendering
hints (`ShapeRendering`, `TextRendering`, `ImageRendering`), clip, mask, and
filter (`ClipPath`, `Mask`, `Filter`, `ClipPathUnits`, `MaskUnits`,
`MaskContentUnits`, `FilterUnits`, `PrimitiveUnits`), gradients (`Offset`,
`StopColor`, `StopOpacity`, `GradientUnits`, `GradientTransform`,
`SpreadMethod`, `Fx`, `Fy`, `Fr`), patterns (`PatternUnits`,
`PatternContentUnits`, `PatternTransform`), markers (`MarkerStart`,
`MarkerMid`, `MarkerEnd`, `MarkerWidth`, `MarkerHeight`, `MarkerUnits`,
`RefX`, `RefY`, `Orient`), and `PreserveAspectRatio`. Any attribute not in this
set stays available through `h.Attribute`.
