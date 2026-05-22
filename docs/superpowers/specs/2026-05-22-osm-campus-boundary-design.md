# OSM Campus Boundary Design

## Goal

Support the current ping-pong matching lobby with free university AOI boundaries. The feature should answer one runtime question: is the user's current location inside an open campus boundary?

This is not a general AOI search product. It only serves campus-gated matching.

## Constraints

- Boundary data must come from free sources.
- OpenStreetMap is the primary source.
- Public OSM services must not be called from normal user lobby entry.
- Runtime matching should remain fast and deterministic.
- If OSM lacks a usable campus polygon, the app may use a manually curated fallback polygon for that campus.
- OSM data attribution must be shown wherever boundary-derived campus gating is described.

## Recommended Approach

Use OpenStreetMap data as an offline or operator-triggered enrichment source, then cache normalized campus boundaries locally in the repo.

The boundary loading order is:

1. Read curated local campus boundaries.
2. Resolve a user location against those polygons.
3. Allow lobby entry only when the location is inside one of the open campus polygons.

The OSM lookup path is used only to create or refresh local campus boundary records:

1. Query Nominatim by campus name with GeoJSON polygon output enabled.
2. If Nominatim does not return a polygon or multipolygon, query Overpass for likely university or education area objects.
3. Normalize the selected geometry into the app's `CampusBoundary` format.
4. Save the boundary into the local open-campus data file.

## Architecture

### Campus Boundary Types

Keep the existing `Coordinates` and `CampusBoundary` concepts in `server/campus-boundaries.ts`.

Update provider metadata from the Baidu-specific shape to an OSM-first shape:

- `provider: "osm" | "manual_fallback"`
- `providerObjectId?: string`
- `sourceLicense?: "ODbL" | "manual"`
- `coordinateSystem: "wgs84"`

Manual fallback records may still use WGS84 coordinates. The matching gate should compare Expo location coordinates directly against WGS84 campus polygons.

### Local Campus Dataset

Create a local campus boundary module, for example `server/open-campus-boundaries.ts`.

It exports the campuses that are currently open for matching. Initially this can include only the current demo campus, but the data shape should support adding more campuses without touching matching logic.

Each record includes:

- stable `id`
- display `name`
- optional `aliases`
- `address`
- `center`
- polygon rings as `Coordinates[][]`
- provider metadata
- update timestamp

### OSM Lookup Utilities

Replace the Baidu-specific fetch helpers with OSM helpers:

- `buildNominatimSearchUrl`
- `fetchNominatimCampusBoundary`
- `buildOverpassCampusQuery`
- `fetchOverpassCampusBoundary`
- `normalizeGeoJsonGeometryToBoundary`

The helpers should be unit-tested and accept injectable `fetchImpl` functions.

They should not be called from `enterLobby`. If a future admin screen uses them, that screen should rate-limit and cache results.

### Matching Flow

`server/matching.ts` keeps the same public behavior:

- `enterLobby({ user, location })`
- `resolveCampus(location)`
- `listLobbyUsers`
- `createBroadcast`
- `listBroadcasts`

Only the source of `campuses` changes from an inline manual fallback list to the local OSM-backed open campus dataset.

## Error Handling

OSM lookup failures should return clear operator-facing errors:

- no search result
- result has no polygon geometry
- unsupported geometry type
- invalid coordinates
- Overpass result cannot be converted into closed rings

Runtime lobby entry should not expose these lookup details to end users. If no local campus polygon contains the user, return the existing `OUTSIDE_OPEN_CAMPUS` denial.

## Testing

Add or update Vitest coverage for:

- Nominatim URL construction with `polygon_geojson=1`.
- GeoJSON `Polygon` normalization.
- GeoJSON `MultiPolygon` normalization.
- rejected non-polygon Nominatim results.
- Overpass query construction for university and education landuse tags.
- point-in-campus behavior using the local open campus dataset.
- matching lobby entry still denies users outside all open campus polygons.

## Operational Notes

Public Nominatim has strict usage limits and requires a valid identifying `User-Agent` or `Referer`. Public Overpass instances are shared community infrastructure. The app should treat both as boundary enrichment tools, not hot-path production dependencies.

The app should display OpenStreetMap attribution in the matching gate or an about/settings page once OSM-derived boundaries are used.

## Out Of Scope

- Real-time AOI search for arbitrary users.
- Commercial map AOI services.
- Administrative UI for editing campus polygons.
- Database persistence for campus boundaries.
- Coordinate conversion between WGS84, GCJ-02, and BD-09.
