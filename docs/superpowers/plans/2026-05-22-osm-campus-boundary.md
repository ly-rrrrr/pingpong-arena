# OSM Campus Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Baidu-oriented AOI boundary prototype with free OpenStreetMap-backed campus boundaries for the existing ping-pong matching gate.

**Architecture:** Runtime matching reads only curated local campus polygons and performs point-in-polygon checks. OSM Nominatim and Overpass helpers exist as operator/development utilities with injectable `fetchImpl`, so tests can verify behavior without network calls and lobby entry never depends on public OSM services.

**Tech Stack:** TypeScript, Expo/React Native, tRPC, Vitest, OpenStreetMap Nominatim/Overpass HTTP APIs, GeoJSON.

---

## File Structure

- Modify `server/campus-boundaries.ts`: keep shared campus types and point-in-polygon logic; replace Baidu helpers with OSM URL builders, fetchers, and GeoJSON/Overpass normalizers.
- Create `server/open-campus-boundaries.ts`: local list of currently open campuses used by matching at runtime.
- Modify `server/matching.ts`: import campuses from the local campus dataset instead of from `server/campus-boundaries.ts`.
- Modify `tests/matching.service.test.ts`: update AOI tests from Baidu to OSM and keep matching runtime behavior covered.
- Modify `todo.md`: replace the Baidu AOI note with the OSM/free-source boundary note.
- Modify `.env.example`: remove Baidu AOI variables; add optional OSM user-agent guidance for operator-side refresh utilities.

---

### Task 1: Local OSM-First Campus Dataset

**Files:**
- Modify: `server/campus-boundaries.ts`
- Create: `server/open-campus-boundaries.ts`
- Modify: `server/matching.ts`
- Test: `tests/matching.service.test.ts`

- [ ] **Step 1: Write the failing test for local open campus runtime resolution**

In `tests/matching.service.test.ts`, update imports from `server/campus-boundaries` so the test imports `fuzhouUniversityQishanCampus` from the new dataset:

```ts
import { fuzhouUniversityQishanCampus } from "../server/open-campus-boundaries";
import {
  isPointInCampusBoundary,
} from "../server/campus-boundaries";
```

Keep the existing expectations:

```ts
expect(resolveCampus(insideMainCampus)).toMatchObject({
  id: "fzu_qishan",
  name: "福州大学旗山校区",
});
expect(isPointInCampusBoundary(insideMainCampus, fuzhouUniversityQishanCampus)).toBe(true);
expect(isPointInCampusBoundary(outsideCampuses, fuzhouUniversityQishanCampus)).toBe(false);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm.cmd test tests/matching.service.test.ts`

Expected: FAIL because `../server/open-campus-boundaries` does not exist.

- [ ] **Step 3: Update the campus boundary type metadata**

In `server/campus-boundaries.ts`, change `CampusBoundary` to:

```ts
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
```

Remove `providerPoiUid`.

- [ ] **Step 4: Create local open campus dataset**

Create `server/open-campus-boundaries.ts`:

```ts
import type { CampusBoundary } from "./campus-boundaries";

export const fuzhouUniversityQishanCampus: CampusBoundary = {
  id: "fzu_qishan",
  name: "福州大学旗山校区",
  aliases: ["福州大学", "Fuzhou University Qishan Campus"],
  address: "福建省福州市福州大学城乌龙江北大道2号",
  provider: "manual_fallback",
  sourceLicense: "manual",
  updatedAt: "2026-05-22",
  coordinateSystem: "wgs84",
  center: { latitude: 26.0608, longitude: 119.2005 },
  boundary: [
    [
      { latitude: 26.0735, longitude: 119.185 },
      { latitude: 26.0665, longitude: 119.1785 },
      { latitude: 26.053, longitude: 119.181 },
      { latitude: 26.0465, longitude: 119.195 },
      { latitude: 26.0495, longitude: 119.211 },
      { latitude: 26.0605, longitude: 119.217 },
      { latitude: 26.0715, longitude: 119.207 },
      { latitude: 26.0735, longitude: 119.185 },
    ],
  ],
};

export const openCampusBoundaries: CampusBoundary[] = [
  fuzhouUniversityQishanCampus,
];
```

- [ ] **Step 5: Wire matching to the local dataset**

In `server/matching.ts`, change imports to:

```ts
import {
  resolveCampusBoundary,
  type CampusBoundary,
  type Coordinates,
} from "./campus-boundaries";
import { openCampusBoundaries } from "./open-campus-boundaries";
```

Keep:

```ts
export const campuses: Campus[] = openCampusBoundaries;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm.cmd test tests/matching.service.test.ts`

Expected: PASS for runtime campus matching tests.

- [ ] **Step 7: Commit**

```bash
git add server/campus-boundaries.ts server/open-campus-boundaries.ts server/matching.ts tests/matching.service.test.ts
git commit -m "refactor: use local open campus boundaries"
```

---

### Task 2: GeoJSON Boundary Normalization

**Files:**
- Modify: `server/campus-boundaries.ts`
- Test: `tests/matching.service.test.ts`

- [ ] **Step 1: Write failing tests for GeoJSON Polygon and MultiPolygon**

Add imports:

```ts
import {
  normalizeGeoJsonGeometryToBoundary,
} from "../server/campus-boundaries";
```

Add tests:

```ts
it("normalizes GeoJSON Polygon coordinates into campus boundary rings", () => {
  const boundary = normalizeGeoJsonGeometryToBoundary({
    type: "Polygon",
    coordinates: [
      [
        [119.1, 26.1],
        [119.2, 26.1],
        [119.2, 26.2],
        [119.1, 26.1],
      ],
    ],
  });

  expect(boundary).toEqual([
    [
      { longitude: 119.1, latitude: 26.1 },
      { longitude: 119.2, latitude: 26.1 },
      { longitude: 119.2, latitude: 26.2 },
      { longitude: 119.1, latitude: 26.1 },
    ],
  ]);
});

it("normalizes GeoJSON MultiPolygon coordinates into campus boundary rings", () => {
  const boundary = normalizeGeoJsonGeometryToBoundary({
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [119.1, 26.1],
          [119.2, 26.1],
          [119.2, 26.2],
          [119.1, 26.1],
        ],
      ],
      [
        [
          [119.3, 26.3],
          [119.4, 26.3],
          [119.4, 26.4],
          [119.3, 26.3],
        ],
      ],
    ],
  });

  expect(boundary).toHaveLength(2);
  expect(boundary[1][0]).toEqual({ longitude: 119.3, latitude: 26.3 });
});

it("rejects GeoJSON geometries that are not polygons", () => {
  expect(() =>
    normalizeGeoJsonGeometryToBoundary({
      type: "Point",
      coordinates: [119.1, 26.1],
    }),
  ).toThrow("OSM result did not include a polygon boundary");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm.cmd test tests/matching.service.test.ts`

Expected: FAIL because `normalizeGeoJsonGeometryToBoundary` is not implemented.

- [ ] **Step 3: Implement GeoJSON normalization**

Add to `server/campus-boundaries.ts`:

```ts
type GeoJsonPosition = [number, number, ...number[]];

type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: GeoJsonPosition[][];
};

type GeoJsonMultiPolygon = {
  type: "MultiPolygon";
  coordinates: GeoJsonPosition[][][];
};

type GeoJsonGeometry = GeoJsonPolygon | GeoJsonMultiPolygon | { type?: unknown; coordinates?: unknown };

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm.cmd test tests/matching.service.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/campus-boundaries.ts tests/matching.service.test.ts
git commit -m "feat: normalize OSM GeoJSON campus boundaries"
```

---

### Task 3: Nominatim Campus Boundary Helper

**Files:**
- Modify: `server/campus-boundaries.ts`
- Test: `tests/matching.service.test.ts`

- [ ] **Step 1: Write failing Nominatim tests**

Add imports:

```ts
import {
  buildNominatimSearchUrl,
  fetchNominatimCampusBoundary,
} from "../server/campus-boundaries";
```

Add tests:

```ts
it("builds a Nominatim search URL that requests GeoJSON polygons", () => {
  const url = buildNominatimSearchUrl({
    query: "福州大学旗山校区",
    limit: 3,
  });

  expect(url.hostname).toBe("nominatim.openstreetmap.org");
  expect(url.pathname).toBe("/search");
  expect(url.searchParams.get("q")).toBe("福州大学旗山校区");
  expect(url.searchParams.get("format")).toBe("geojson");
  expect(url.searchParams.get("polygon_geojson")).toBe("1");
  expect(url.searchParams.get("limit")).toBe("3");
});

it("loads a campus boundary from a Nominatim GeoJSON polygon result", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            osm_type: "relation",
            osm_id: 123,
            display_name: "福州大学旗山校区, 福州",
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [119.1, 26.1],
                [119.2, 26.1],
                [119.2, 26.2],
                [119.1, 26.1],
              ],
            ],
          },
        },
      ],
    }));

  const campus = await fetchNominatimCampusBoundary({
    id: "fzu_qishan",
    name: "福州大学旗山校区",
    address: "福建省福州市",
    query: "福州大学旗山校区",
    userAgent: "pingpong-arena-test/1.0",
    fetchImpl,
  });

  expect(campus).toMatchObject({
    id: "fzu_qishan",
    name: "福州大学旗山校区",
    provider: "osm",
    providerObjectId: "relation/123",
    sourceLicense: "ODbL",
    coordinateSystem: "wgs84",
  });
  expect(campus.boundary[0]).toHaveLength(4);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm.cmd test tests/matching.service.test.ts`

Expected: FAIL because Nominatim helpers are not implemented.

- [ ] **Step 3: Implement Nominatim helpers**

Add to `server/campus-boundaries.ts`:

```ts
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

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

export function buildNominatimSearchUrl({ query, limit = 3 }: NominatimSearchInput) {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "geojson");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("limit", String(limit));
  return url;
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm.cmd test tests/matching.service.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/campus-boundaries.ts tests/matching.service.test.ts
git commit -m "feat: add Nominatim campus boundary lookup"
```

---

### Task 4: Overpass Fallback Helper

**Files:**
- Modify: `server/campus-boundaries.ts`
- Test: `tests/matching.service.test.ts`

- [ ] **Step 1: Write failing Overpass tests**

Add imports:

```ts
import {
  buildOverpassCampusQuery,
  fetchOverpassCampusBoundary,
} from "../server/campus-boundaries";
```

Add tests:

```ts
it("builds an Overpass campus query for university and education polygons", () => {
  const query = buildOverpassCampusQuery({
    namePattern: "福州大学|Fuzhou University",
  });

  expect(query).toContain("[out:json]");
  expect(query).toContain('way["amenity"="university"]["name"~"福州大学|Fuzhou University", i]');
  expect(query).toContain('relation["landuse"="education"]["name"~"福州大学|Fuzhou University", i]');
  expect(query).toContain("out geom;");
});

it("loads a campus boundary from an Overpass way geometry result", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({
      elements: [
        {
          type: "way",
          id: 456,
          tags: { name: "福州大学旗山校区" },
          geometry: [
            { lon: 119.1, lat: 26.1 },
            { lon: 119.2, lat: 26.1 },
            { lon: 119.2, lat: 26.2 },
            { lon: 119.1, lat: 26.1 },
          ],
        },
      ],
    }));

  const campus = await fetchOverpassCampusBoundary({
    id: "fzu_qishan",
    name: "福州大学旗山校区",
    address: "福建省福州市",
    namePattern: "福州大学|Fuzhou University",
    fetchImpl,
  });

  expect(campus).toMatchObject({
    id: "fzu_qishan",
    provider: "osm",
    providerObjectId: "way/456",
    sourceLicense: "ODbL",
    coordinateSystem: "wgs84",
  });
  expect(campus.boundary[0]).toHaveLength(4);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm.cmd test tests/matching.service.test.ts`

Expected: FAIL because Overpass helpers are not implemented.

- [ ] **Step 3: Implement Overpass helpers**

Add to `server/campus-boundaries.ts`:

```ts
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
      const osmId = typeof record.id === "number" || typeof record.id === "string" ? record.id : undefined;
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm.cmd test tests/matching.service.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/campus-boundaries.ts tests/matching.service.test.ts
git commit -m "feat: add Overpass campus boundary fallback"
```

---

### Task 5: Remove Baidu AOI Notes and Verify Whole Project

**Files:**
- Modify: `.env.example`
- Modify: `todo.md`
- Test: all tests and typecheck

- [ ] **Step 1: Update `.env.example`**

Replace the Baidu variables with:

```dotenv
# Optional identifier for operator-side OpenStreetMap boundary refresh utilities.
# Public Nominatim requires a valid User-Agent or Referer identifying the app.
OSM_USER_AGENT=pingpong-arena/1.0 contact@example.com
```

- [ ] **Step 2: Update `todo.md`**

Replace the “百度 AOI 校区边界接入” section with:

```md
# 免费 OSM 高校边界接入

- 已将校区准入从 `center + radiusMeters` 改为 polygon 边界命中。
- 当前运行时只读取本地开放高校 polygon，不在用户进入大厅时请求公共 OSM 服务。
- 免费边界来源优先使用 OpenStreetMap：
  - Nominatim：按高校名称查询 GeoJSON polygon。
  - Overpass：在 Nominatim 无 polygon 时查询 `amenity=university` 或 `landuse=education` 面数据。
- 如果 OSM 没有可用高校边界，保留手工维护的 `manual_fallback` polygon。
- 使用 OSM 衍生边界时需要在应用中展示 OpenStreetMap 署名。
```

- [ ] **Step 3: Run full verification**

Run:

```bash
pnpm.cmd test
pnpm.cmd check
```

Expected:

- Vitest reports all non-skipped tests passing.
- TypeScript reports no errors.

- [ ] **Step 4: Commit**

```bash
git add .env.example todo.md server/campus-boundaries.ts server/open-campus-boundaries.ts server/matching.ts tests/matching.service.test.ts
git commit -m "feat: switch campus boundaries to free OSM sources"
```

---

## Self-Review

- Spec coverage: The plan covers local runtime campus matching, free OSM lookup helpers, Nominatim first, Overpass fallback, manual fallback polygons, OSM attribution notes, and tests.
- Placeholder scan: No `TODO` or `TBD` placeholders are used as plan content.
- Type consistency: `CampusBoundary`, `Coordinates`, `providerObjectId`, `sourceLicense`, `buildNominatimSearchUrl`, `fetchNominatimCampusBoundary`, `buildOverpassCampusQuery`, `fetchOverpassCampusBoundary`, and `normalizeGeoJsonGeometryToBoundary` are named consistently across tasks.
