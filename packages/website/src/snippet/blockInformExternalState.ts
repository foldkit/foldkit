ChangedUrl: ({ route }) =>
  PriceSliderBinding.informOfRangeChange({
    min: route.minPrice,
    max: route.maxPrice,
  })(model)
