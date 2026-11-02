ChangedUrl: ({ route }) =>
  PriceSliderBinding.informRangeChange({
    min: route.minPrice,
    max: route.maxPrice,
  })(model)
