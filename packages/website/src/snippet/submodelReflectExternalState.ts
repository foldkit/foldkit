ChangedUrl: ({ route }) => [
  evo(model, {
    // The URL owns the price bounds, so reflect them onto the Slider. reflectRange
    // returns Model (point-free in evo) and emits nothing, so it can't echo the
    // route back and loop.
    priceSlider: Slider.reflectRange({
      min: route.minPrice,
      max: route.maxPrice,
    }),
  }),
  [],
]
