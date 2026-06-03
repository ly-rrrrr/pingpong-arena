export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type CoordinateSystem = "wgs84" | "gcj02" | "bd09";

export type CampusBoundaryProvider = "osm" | "manual_fallback";

export type CampusBoundary = {
  id: string;
  name: string;
  aliases?: string[];
  address: string;
  provider: CampusBoundaryProvider;
  providerObjectId?: string;
  sourceLicense: "ODbL" | "manual";
  updatedAt: string;
  coordinateSystem: CoordinateSystem;
  center: Coordinates;
  boundary: Coordinates[][];
};

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

type NominatimSearchInput = {
  query: string;
  limit?: number;
};

type NominatimCampusBoundaryInput = NominatimSearchInput & {
  id: string;
  name: string;
  address: string;
  userAgent: string;
  fetchImpl?: (url: URL, init?: RequestInit) => Promise<Response>;
};

type OverpassCampusQueryInput = {
  namePattern: string;
};

type OverpassCampusBoundaryInput = OverpassCampusQueryInput & {
  id: string;
  name: string;
  address: string;
  fetchImpl?: (url: URL, init?: RequestInit) => Promise<Response>;
};

const OVERPASS_INTERPRETER_URL = "https://overpass-api.de/api/interpreter";

export function buildNominatimSearchUrl({ query, limit = 3 }: NominatimSearchInput) {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "geojson");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("limit", String(limit));
  return url;
}

export function buildOverpassCampusQuery({ namePattern }: OverpassCampusQueryInput) {
  return `[out:json][timeout:25];
(
  way["amenity"="university"]["name"~"${namePattern}", i];
  relation["amenity"="university"]["name"~"${namePattern}", i];
  way["landuse"="education"]["name"~"${namePattern}", i];
  relation["landuse"="education"]["name"~"${namePattern}", i];
);
out geom;`;
}

function getOsmObjectId(properties: Record<string, unknown>) {
  const osmType = typeof properties.osm_type === "string" ? properties.osm_type : undefined;
  const osmId = properties.osm_id;
  if (!osmType || (typeof osmId !== "number" && typeof osmId !== "string")) return undefined;
  return `${osmType}/${osmId}`;
}

export async function fetchNominatimCampusBoundary({
  id,
  name,
  address,
  query,
  limit,
  userAgent,
  fetchImpl = fetch,
}: NominatimCampusBoundaryInput): Promise<CampusBoundary> {
  const response = await fetchImpl(buildNominatimSearchUrl({ query, limit }), {
    headers: { "User-Agent": userAgent },
  });
  if (!response.ok) {
    throw new Error(`Nominatim campus boundary query failed with ${response.status}`);
  }

  const payload = await response.json();
  const features = (payload as { features?: unknown }).features;
  if (!Array.isArray(features)) {
    throw new Error(`Nominatim returned no campus results for ${query}`);
  }

  for (const feature of features) {
    if (!feature || typeof feature !== "object") continue;
    const record = feature as { geometry?: unknown; properties?: unknown };
    try {
      const boundary = normalizeGeoJsonGeometryToBoundary(record.geometry as GeoJsonGeometry);
      const properties =
        record.properties && typeof record.properties === "object"
          ? (record.properties as Record<string, unknown>)
          : {};
      return {
        id,
        name,
        address,
        provider: "osm",
        providerObjectId: getOsmObjectId(properties),
        sourceLicense: "ODbL",
        updatedAt: new Date().toISOString().slice(0, 10),
        coordinateSystem: "wgs84",
        center: getBoundaryCenter(boundary[0]),
        boundary,
      };
    } catch {
      continue;
    }
  }

  throw new Error(`Nominatim returned no polygon campus boundary for ${query}`);
}

function normalizeOverpassGeometry(geometry: unknown): Coordinates[] {
  if (!Array.isArray(geometry)) {
    throw new Error("Overpass result did not include geometry");
  }

  const ring = geometry.map((point) => {
    const record = point as Record<string, unknown>;
    const latitude = Number(record.lat);
    const longitude = Number(record.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Invalid Overpass boundary coordinate");
    }
    return { latitude, longitude };
  });

  if (ring.length < 4) {
    throw new Error("Overpass polygon ring must contain at least 4 points");
  }
  return ring;
}

export async function fetchOverpassCampusBoundary({
  id,
  name,
  address,
  namePattern,
  fetchImpl = fetch,
}: OverpassCampusBoundaryInput): Promise<CampusBoundary> {
  const url = new URL(OVERPASS_INTERPRETER_URL);
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: buildOverpassCampusQuery({ namePattern }) }),
  });
  if (!response.ok) {
    throw new Error(`Overpass campus boundary query failed with ${response.status}`);
  }

  const payload = await response.json();
  const elements = (payload as { elements?: unknown }).elements;
  if (!Array.isArray(elements)) {
    throw new Error(`Overpass returned no campus results for ${namePattern}`);
  }

  for (const element of elements) {
    if (!element || typeof element !== "object") continue;
    const record = element as Record<string, unknown>;
    try {
      const ring = normalizeOverpassGeometry(record.geometry);
      const osmType = typeof record.type === "string" ? record.type : "osm";
      const osmId =
        typeof record.id === "number" || typeof record.id === "string" ? record.id : undefined;
      return {
        id,
        name,
        address,
        provider: "osm",
        providerObjectId: osmId === undefined ? undefined : `${osmType}/${osmId}`,
        sourceLicense: "ODbL",
        updatedAt: new Date().toISOString().slice(0, 10),
        coordinateSystem: "wgs84",
        center: getBoundaryCenter(ring),
        boundary: [ring],
      };
    } catch {
      continue;
    }
  }

  throw new Error(`Overpass returned no polygon campus boundary for ${namePattern}`);
}

function getBoundaryCenter(ring: Coordinates[]): Coordinates {
  const total = ring.reduce(
    (sum, point) => ({
      latitude: sum.latitude + point.latitude,
      longitude: sum.longitude + point.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: total.latitude / ring.length,
    longitude: total.longitude / ring.length,
  };
}

type GeoJsonPosition = [number, number, ...number[]];

type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: GeoJsonPosition[][];
};

type GeoJsonMultiPolygon = {
  type: "MultiPolygon";
  coordinates: GeoJsonPosition[][][];
};

type GeoJsonGeometry =
  | GeoJsonPolygon
  | GeoJsonMultiPolygon
  | { type?: unknown; coordinates?: unknown };

function normalizeGeoJsonPosition(position: GeoJsonPosition): Coordinates {
  const [longitude, latitude] = position;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Invalid OSM boundary coordinate");
  }
  return { latitude, longitude };
}

function normalizeGeoJsonRing(ring: GeoJsonPosition[]): Coordinates[] {
  const normalized = ring.map(normalizeGeoJsonPosition);
  if (normalized.length < 4) {
    throw new Error("OSM polygon ring must contain at least 4 points");
  }
  return normalized;
}

export function normalizeGeoJsonGeometryToBoundary(geometry: GeoJsonGeometry): Coordinates[][] {
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map(normalizeGeoJsonRing);
  }

  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.flatMap((polygon) => polygon.map(normalizeGeoJsonRing));
  }

  throw new Error("OSM result did not include a polygon boundary");
}

function toTsLiteral(value: unknown, indent = 0): string {
  const space = " ".repeat(indent);
  const nextSpace = " ".repeat(indent + 2);

  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((item) => `${nextSpace}${toTsLiteral(item, indent + 2)}`).join(",\n")},\n${space}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, entryValue]) => entryValue !== undefined,
    );
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(([key, entryValue]) => `${nextSpace}${key}: ${toTsLiteral(entryValue, indent + 2)}`)
      .join(",\n")},\n${space}}`;
  }
  return "undefined";
}

export function formatCampusBoundaryForSource(campus: CampusBoundary) {
  return toTsLiteral(campus);
}

export function isPointInCampusBoundary(point: Coordinates, campus: CampusBoundary) {
  return campus.boundary.some((ring) => pointInPolygon(point, ring));
}

export function resolveCampusBoundary(
  location: Coordinates,
  campuses: CampusBoundary[],
) {
  return campuses.find((campus) => isPointInCampusBoundary(location, campus)) ?? null;
}

function pointInPolygon(point: Coordinates, polygon: Coordinates[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const current = polygon[i];
    const previous = polygon[j];
    const intersects =
      current.latitude > point.latitude !== previous.latitude > point.latitude &&
      point.longitude <
        ((previous.longitude - current.longitude) * (point.latitude - current.latitude)) /
          (previous.latitude - current.latitude) +
          current.longitude;
    if (intersects) inside = !inside;
  }
  return inside;
}
