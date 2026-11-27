/**
 * Prueba manual del parser de ubicaciones (`dist/Services/map-location.js`).
 *
 *   npm run build && node scripts/test-location-parser.js
 */
const assert = require('assert')
const {
  parseMapLocation,
  parseCoordinatePair,
} = require('../dist/Services/map-location.js')

const cases = [
  // Texto libre
  {
    input: 'Av. Corrientes 1234, CABA',
    expect: (r) => r.display === 'Av. Corrientes 1234, CABA' && r.query === 'Av. Corrientes 1234, CABA' && !r.coordinates,
  },
  // Coordenadas sueltas
  {
    input: '-34.6037, -58.3816',
    expect: (r) => r.coordinates.latitude === -34.6037 && r.coordinates.longitude === -58.3816,
  },
  // Google Maps con @lat,lng
  {
    input: 'https://www.google.com/maps/@-34.603722,-58.381611,17z',
    expect: (r) => r.coordinates.latitude === -34.603722 && r.coordinates.longitude === -58.381611,
  },
  // Google Maps con q=lat,lng
  {
    input: 'https://maps.google.com/?q=-34.6037,-58.3816',
    expect: (r) => r.coordinates.latitude === -34.6037 && r.coordinates.longitude === -58.3816,
  },
  // Google Maps con ll=
  {
    input: 'https://www.google.com/maps?ll=-34.6,-58.38&z=15',
    expect: (r) => r.coordinates.latitude === -34.6 && r.coordinates.longitude === -58.38,
  },
  // Google Maps con !3d/!4d
  {
    input:
      'https://www.google.com/maps/place/Luna+Park/@-34.6053,-58.3825,17z/data=!3m1!4b1!4d-58.3825!3d-34.6053',
    expect: (r) => r.coordinates.latitude === -34.6053 && r.coordinates.longitude === -58.3825,
  },
  // Google Maps con /place/Nombre/@lat,lng
  {
    input: 'https://www.google.com/maps/place/La+Pampa/@-34.6053,-58.3825,17z',
    expect: (r) => r.display === 'La Pampa' && r.coordinates.latitude === -34.6053,
  },
  // Google Maps con ?query=texto (sin coordenadas)
  {
    input:
      'https://www.google.com/maps/search/?api=1&query=Foo+Bar+Buenos+Aires',
    expect: (r) => r.display === 'Foo Bar Buenos Aires' && r.query === 'Foo Bar Buenos Aires' && !r.coordinates,
  },
  // Link corto de Google Maps
  {
    input: 'https://maps.app.goo.gl/abcdef',
    expect: (r) => r.needsResolution === true,
  },
  // geo: URI
  {
    input: 'geo:-34.6037,-58.3816?q=Obelisco',
    expect: (r) => r.coordinates.latitude === -34.6037 && r.display === 'Obelisco',
  },
  // OpenStreetMap
  {
    input: 'https://www.openstreetmap.org/#map=17/-34.6037/-58.3816',
    expect: (r) => r.coordinates.latitude === -34.6037 && r.coordinates.longitude === -58.3816,
  },
  // OpenStreetMap con mlat/mlon
  {
    input: 'https://www.openstreetmap.org/?mlat=-34.6&mlon=-58.38#map=17/-34.6/-58.38',
    expect: (r) => r.coordinates.latitude === -34.6 && r.coordinates.longitude === -58.38,
  },
]

let failed = 0
for (const testCase of cases) {
  const parsed = parseMapLocation(testCase.input)
  try {
    assert.ok(testCase.expect(parsed), `no coincidió: ${JSON.stringify(parsed)}`)
    console.log(`OK   ${testCase.input}`)
  } catch (error) {
    failed += 1
    console.log(`FAIL ${testCase.input}`)
    console.log(`     ${JSON.stringify(parsed)}`)
  }
}

// Casos borde de coordenadas
assert.strictEqual(parseCoordinatePair('999,999'), null)
assert.strictEqual(parseCoordinatePair('no soy un lugar'), null)
assert.deepStrictEqual(parseCoordinatePair('-34.6,-58.4'), {
  latitude: -34.6,
  longitude: -58.4,
})

console.log(failed === 0 ? '\nTodos los casos pasaron.' : `\n${failed} casos fallaron.`)
process.exit(failed === 0 ? 0 : 1)
