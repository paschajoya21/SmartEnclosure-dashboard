const SPECIES_CONDITIONS = [
  { species: 'Ball Python', scientificName: 'Python regius', warmSide: '30-32 C', coolSide: '22-26 C', humidity: '45-75%' },
  { species: 'Leopard Gecko', scientificName: 'Eublepharis macularius', warmSide: '32-33 C', coolSide: '21-25 C', humidity: '30-40%' },
  { species: 'Green Iguana', scientificName: 'Iguana iguana', warmSide: '29-31 C', coolSide: '23-28 C', humidity: '60-80%' },
  { species: 'Reticulated Python', scientificName: 'Malayopython reticulatus', warmSide: '31-34 C', coolSide: '24-29 C', humidity: '65-90%' },
  { species: 'Yellowbelly slider', scientificName: 'Trachemys scripta scripta', warmSide: '35-40 C', coolSide: '23-24 C', humidity: 'Lingkungan akuatik' },
  { species: 'Kingsnake', scientificName: 'Lampropeltis spp.', warmSide: '29-32 C', coolSide: '21-26 C', humidity: '40-60%' },
  { species: 'Red-Footed Tortoise', scientificName: 'Chelonoidis carbonarius', warmSide: '30-32 C', coolSide: '24-27 C', humidity: '70-80%' },
  { species: 'Argentine black and white Tegu', scientificName: 'Salvator merianae', warmSide: '38-43 C', coolSide: '24-29 C', humidity: '60-80%' },
  { species: 'Central bearded dragon', scientificName: 'Pogona vitticeps', warmSide: '40-46 C', coolSide: '22-29 C', humidity: '30-60%' },
  { species: 'Boa constrictor', scientificName: 'Boa constrictor', warmSide: '30-32 C', coolSide: '24-26 C', humidity: '60-70%' },
  { species: 'Burmese Python', scientificName: 'Python bivittatus', warmSide: '32-34 C', coolSide: '27-31 C', humidity: '60-90%' },
  { species: 'Corn Snake', scientificName: 'Pantherophis guttatus', warmSide: '32 C', coolSide: '23-24 C', humidity: '40-60%' },
  { species: 'Crested Gecko', scientificName: 'Correlophus ciliatus', warmSide: '24-26 C', coolSide: '21-23 C', humidity: '60-80%' },
  { species: 'Eastern hognose snake', scientificName: 'Heterodon platirhinos', warmSide: '31-32 C', coolSide: '21-24 C', humidity: '30-50%' },
  { species: 'Giant Bluetongue Skink', scientificName: 'Tiliqua sp.', warmSide: '35-40 C', coolSide: '24-29 C', humidity: '60-80%' },
  { species: 'Milk snake', scientificName: 'Lampropeltis triangulum', warmSide: '29-31 C', coolSide: '21-24 C', humidity: '40-60%' },
  { species: 'African Fat-Tail Gecko', scientificName: 'Hemitheconyx caudicinctus', warmSide: '31-33 C', coolSide: '24-26 C', humidity: '50-70%' },
];

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const SPECIES_BY_NORMALIZED_NAME = new Map(
  SPECIES_CONDITIONS.map((entry) => [normalizeName(entry.species), entry])
);

function getSpeciesCondition(name) {
  return SPECIES_BY_NORMALIZED_NAME.get(normalizeName(name)) || null;
}

function parseRange(value) {
  const text = String(value || '');
  const matches = text.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  const min = Number(matches[0]);
  const max = Number(matches[1] || matches[0]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

module.exports = {
  SPECIES_CONDITIONS,
  getSpeciesCondition,
  normalizeName,
  parseRange,
};
