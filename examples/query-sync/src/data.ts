type Dinosaur = Readonly<{
  name: string
  period: string
  diet: string
  lengthMeters: number
  weightKg: number
}>

const dinosaurs: ReadonlyArray<Dinosaur> = [
  {
    name: 'Tyrannosaurus Rex',
    period: 'Cretaceous',
    diet: 'Carnivore',
    lengthMeters: 12.3,
    weightKg: 8400,
  },
  {
    name: 'Triceratops',
    period: 'Cretaceous',
    diet: 'Herbivore',
    lengthMeters: 9,
    weightKg: 6000,
  },
  {
    name: 'Velociraptor',
    period: 'Cretaceous',
    diet: 'Carnivore',
    lengthMeters: 2,
    weightKg: 15,
  },
  {
    name: 'Brachiosaurus',
    period: 'Jurassic',
    diet: 'Herbivore',
    lengthMeters: 26,
    weightKg: 56000,
  },
  {
    name: 'Stegosaurus',
    period: 'Jurassic',
    diet: 'Herbivore',
    lengthMeters: 9,
    weightKg: 3500,
  },
  {
    name: 'Ankylosaurus',
    period: 'Cretaceous',
    diet: 'Herbivore',
    lengthMeters: 6.5,
    weightKg: 6000,
  },
  {
    name: 'Spinosaurus',
    period: 'Cretaceous',
    diet: 'Carnivore',
    lengthMeters: 15,
    weightKg: 7000,
  },
  {
    name: 'Allosaurus',
    period: 'Jurassic',
    diet: 'Carnivore',
    lengthMeters: 9.7,
    weightKg: 2300,
  },
  {
    name: 'Diplodocus',
    period: 'Jurassic',
    diet: 'Herbivore',
    lengthMeters: 25,
    weightKg: 12000,
  },
  {
    name: 'Parasaurolophus',
    period: 'Cretaceous',
    diet: 'Herbivore',
    lengthMeters: 9.5,
    weightKg: 2500,
  },
  {
    name: 'Compsognathus',
    period: 'Jurassic',
    diet: 'Carnivore',
    lengthMeters: 1,
    weightKg: 3,
  },
  {
    name: 'Pachycephalosaurus',
    period: 'Cretaceous',
    diet: 'Herbivore',
    lengthMeters: 4.5,
    weightKg: 450,
  },
  {
    name: 'Dilophosaurus',
    period: 'Jurassic',
    diet: 'Carnivore',
    lengthMeters: 7,
    weightKg: 400,
  },
  {
    name: 'Iguanodon',
    period: 'Cretaceous',
    diet: 'Herbivore',
    lengthMeters: 10,
    weightKg: 3500,
  },
  {
    name: 'Gallimimus',
    period: 'Cretaceous',
    diet: 'Omnivore',
    lengthMeters: 6,
    weightKg: 440,
  },
  {
    name: 'Therizinosaurus',
    period: 'Cretaceous',
    diet: 'Herbivore',
    lengthMeters: 10,
    weightKg: 5000,
  },
  {
    name: 'Carnotaurus',
    period: 'Cretaceous',
    diet: 'Carnivore',
    lengthMeters: 7.5,
    weightKg: 1300,
  },
  {
    name: 'Oviraptor',
    period: 'Cretaceous',
    diet: 'Omnivore',
    lengthMeters: 1.6,
    weightKg: 33,
  },
  {
    name: 'Baryonyx',
    period: 'Cretaceous',
    diet: 'Carnivore',
    lengthMeters: 10,
    weightKg: 1700,
  },
  {
    name: 'Coelophysis',
    period: 'Triassic',
    diet: 'Carnivore',
    lengthMeters: 3,
    weightKg: 20,
  },
  {
    name: 'Plateosaurus',
    period: 'Triassic',
    diet: 'Herbivore',
    lengthMeters: 8,
    weightKg: 700,
  },
  {
    name: 'Herrerasaurus',
    period: 'Triassic',
    diet: 'Carnivore',
    lengthMeters: 6,
    weightKg: 350,
  },
]

export { type Dinosaur, dinosaurs }
