/**
 * Interpretación de la ubicación de un evento.
 *
 * El usuario puede escribir el lugar de varias maneras:
 *  - texto libre: "Av. Corrientes 1234, CABA"
 *  - coordenadas: "-34.6037, -58.3816"
 *  - link de Google Maps: "https://maps.app.goo.gl/abc" o
 *    "https://www.google.com/maps/@-34.6037,-58.3816,17z"
 *  - link de OpenStreetMap: "https://www.openstreetmap.org/#map=17/-34.6/-58.38"
 *
 * Este módulo es puro: no hace requests. Los links cortos de Google
 * (maps.app.goo.gl) hay que resolverlos aparte porque esconden la URL final
 * (ver `EventService.resolveShortMapLink`).
 */

export type Coordinates = {
  latitude: number
  longitude: number
}

export type ParsedLocation = {
  /** Texto final que se guarda como `location`. */
  display: string
  /** Coordenadas leídas del link (si las había). */
  coordinates?: Coordinates | undefined
  /** Texto que hay que geocodificar (dirección o nombre del lugar). */
  query?: string | undefined
  /** La ubicación es un link corto que hay que resolver por HTTP. */
  needsResolution: boolean
  /** Texto original tal cual lo escribió el usuario. */
  raw: string
}

const COORDINATE_PAIR =
  /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/

/** Convierte "lat, lng" en coordenadas, validando los rangos. */
export function parseCoordinatePair(value: string): Coordinates | null {
  const match = COORDINATE_PAIR.exec(value ?? '')
  if (!match) return null

  const latitude = Number(match[1])
  const longitude = Number(match[2])
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90) return null
  if (longitude < -180 || longitude > 180) return null

  return { latitude, longitude }
}

function buildCoordinates(
  latitude: string | undefined,
  longitude: string | undefined,
): Coordinates | null {
  if (!latitude || !longitude) return null
  return parseCoordinatePair(`${latitude},${longitude}`)
}

function isGoogleHost(host: string): boolean {
  return (
    host === 'goo.gl' ||
    host.endsWith('.goo.gl') ||
    host === 'google.com' ||
    host.endsWith('.google.com') ||
    host.startsWith('google.')
  )
}

function isOsmHost(host: string): boolean {
  return host === 'openstreetmap.org' || host.endsWith('.openstreetmap.org')
}

function decodeLabel(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' ')).trim()
  } catch {
    return value.replace(/\+/g, ' ').trim()
  }
}

/** Coordenadas del path de Google Maps: /maps/@-34.6,-58.38,17z */
function coordinatesFromGooglePath(pathname: string): Coordinates | null {
  const match = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(pathname)
  return buildCoordinates(match?.[1], match?.[2])
}

/** Coordenadas del formato !3d<lat>!4d<lng> (URLs "compartidas" de Maps). */
function coordinatesFromGoogleData(href: string): Coordinates | null {
  const lat = /!3d(-?\d+(?:\.\d+)?)/.exec(href)?.[1]
  const lng = /!4d(-?\d+(?:\.\d+)?)/.exec(href)?.[1]
  return buildCoordinates(lat, lng)
}

/** Coordenadas en los query params: ll, center, q, query, address. */
function coordinatesFromQuery(url: URL): Coordinates | null {
  for (const key of ['ll', 'center', 'q', 'query', 'address']) {
    const value = url.searchParams.get(key)
    if (!value) continue
    const coordinates = parseCoordinatePair(value)
    if (coordinates) return coordinates
  }
  return null
}

/** Nombre legible del lugar dentro de un link de Google Maps. */
function labelFromGoogle(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean)
  const markerIndex = segments.findIndex(
    (segment) => segment === 'place' || segment === 'search',
  )
  if (markerIndex >= 0) {
    const segment = segments[markerIndex + 1]
    if (segment) {
      const label = decodeLabel(segment)
      if (label) return label
    }
  }

  for (const key of ['q', 'query', 'address']) {
    const value = url.searchParams.get(key)
    if (!value) continue
    if (parseCoordinatePair(value)) continue
    const label = decodeLabel(value)
    if (label) return label
  }

  return ''
}

/** Coordenadas de un link de OpenStreetMap (#map=17/lat/lng o mlat/mlon). */
function coordinatesFromOsm(url: URL): Coordinates | null {
  const hash = url.hash ?? ''
  const hashMatch = /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/.exec(hash)
  if (hashMatch) {
    return buildCoordinates(hashMatch[1], hashMatch[2])
  }

  const mlat = url.searchParams.get('mlat')
  const mlon = url.searchParams.get('mlon')
  return buildCoordinates(mlat ?? undefined, mlon ?? undefined)
}

/**
 * Interpreta la ubicación escrita por el usuario.
 * No lanza excepciones: devuelve lo que pudo entender.
 */
export function parseMapLocation(raw: string): ParsedLocation {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) {
    return { display: trimmed, needsResolution: false, raw: trimmed }
  }

  // geo:-34.6037,-58.3816?q=Nombre+del+lugar
  if (/^geo:/i.test(trimmed)) {
    const payload = trimmed.slice(4)
    const [coordsPart, queryPart] = payload.split('?')
    const coordinates = parseCoordinatePair(decodeURIComponent(coordsPart ?? ''))
    const query = queryPart ? decodeURIComponent(queryPart.replace(/^q=/i, '')) : ''
    return {
      display: query || coordinates ? query || trimmed : trimmed,
      coordinates: coordinates ?? undefined,
      query: query && !coordinates ? query : undefined,
      needsResolution: false,
      raw: trimmed,
    }
  }

  // Texto libre o coordenadas sueltas.
  if (!/^https?:\/\//i.test(trimmed)) {
    const coordinates = parseCoordinatePair(trimmed)
    return {
      display: trimmed,
      coordinates: coordinates ?? undefined,
      query: coordinates ? undefined : trimmed,
      needsResolution: false,
      raw: trimmed,
    }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return {
      display: trimmed,
      query: trimmed,
      needsResolution: false,
      raw: trimmed,
    }
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')

  if (isOsmHost(host)) {
    const coordinates = coordinatesFromOsm(url)
    return {
      display: trimmed,
      coordinates: coordinates ?? undefined,
      query: coordinates ? undefined : trimmed,
      needsResolution: false,
      raw: trimmed,
    }
  }

  if (isGoogleHost(host)) {
    // Link corto: la URL real está detrás de una redirección.
    if (host === 'goo.gl' || host.endsWith('.goo.gl')) {
      return {
        display: trimmed,
        needsResolution: true,
        raw: trimmed,
      }
    }

    const coordinates =
      coordinatesFromGooglePath(url.pathname) ??
      coordinatesFromGoogleData(url.href) ??
      coordinatesFromQuery(url) ??
      undefined

    const label = labelFromGoogle(url)

    return {
      display: label || trimmed,
      coordinates,
      query: coordinates || !label ? undefined : label,
      needsResolution: false,
      raw: trimmed,
    }
  }

  // Otra URL (no es un mapa): se geocodifica el texto de la URL.
  return {
    display: trimmed,
    query: trimmed,
    needsResolution: false,
    raw: trimmed,
  }
}
