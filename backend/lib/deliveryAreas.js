// Supported delivery coverage for Rayjin Hardware.
// Barangay names are based on the Philippine Statistics Authority PSGC
// listings for Initao, Libertad, Naawan, and Gitagum, Misamis Oriental.
// Pricing is NOT stored here. Surcharges remain configurable in delivery_rates.

export const SUPPORTED_DELIVERY_AREAS = Object.freeze({
  Initao: Object.freeze([
    'Aluna',
    'Andales',
    'Apas',
    'Calacapan',
    'Gimangpang',
    'Jampason',
    'Kamelon',
    'Kanitoan',
    'Oguis',
    'Pagahan',
    'Poblacion',
    'Pontacon',
    'San Pedro',
    'Sinalac',
    'Tawantawan',
    'Tubigan',
  ]),
  Libertad: Object.freeze([
    'Dulong',
    'Gimaylan',
    'Kimalok',
    'Lubluban',
    'Poblacion',
    'Retablo',
    'Santo Niño',
    'Tangcub',
    'Taytayan',
  ]),
  Naawan: Object.freeze([
    'Don Pedro',
    'Linangkayan',
    'Lubilan',
    'Mapulog',
    'Maputi',
    'Mat-i',
    'Patag',
    'Poblacion',
    'Tagbalogo',
    'Tuboran',
  ]),
  Gitagum: Object.freeze([
    'Burnay',
    'Carlos P. Garcia',
    'Cogon',
    'Gregorio Pelaez',
    'Kilangit',
    'Matangad',
    'Pangayawan',
    'Poblacion',
    'Quezon',
    'Tala-o',
    'Ulab',
  ]),
});

export const SUPPORTED_DELIVERY_MUNICIPALITIES = Object.freeze(
  Object.keys(SUPPORTED_DELIVERY_AREAS)
);

export function normalizeDeliveryMunicipality(value) {
  const clean = String(value || '').trim().toLowerCase();
  return SUPPORTED_DELIVERY_MUNICIPALITIES.find(
    (municipality) => municipality.toLowerCase() === clean
  ) || null;
}

export function normalizeDeliveryBarangay(municipality, value) {
  const normalizedMunicipality = normalizeDeliveryMunicipality(municipality);
  if (!normalizedMunicipality) return null;

  const cleanBarangay = String(value || '').trim().toLowerCase();
  return SUPPORTED_DELIVERY_AREAS[normalizedMunicipality].find(
    (barangay) => barangay.toLowerCase() === cleanBarangay
  ) || null;
}

export function isSupportedDeliveryCombination(municipality, barangay) {
  return Boolean(normalizeDeliveryBarangay(municipality, barangay));
}
