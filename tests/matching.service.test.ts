import { describe, expect, it } from "vitest";
import {
  cancelBroadcast,
  createBroadcast,
  enterLobby,
  listBroadcasts,
  listLobbyUsers,
  refreshPresence,
  resetMatchingStoreForTests,
  resolveCampus,
} from "../server/matching";
import {
  buildNominatimSearchUrl,
  buildOverpassCampusQuery,
  fetchNominatimCampusBoundary,
  fetchOverpassCampusBoundary,
  formatCampusBoundaryForSource,
  isPointInCampusBoundary,
  normalizeGeoJsonGeometryToBoundary,
} from "../server/campus-boundaries";
import { fuzhouUniversityQishanCampus } from "../server/open-campus-boundaries";

const insideMainCampus = {
  latitude: 26.0608,
  longitude: 119.2005,
};

const outsideCampuses = {
  latitude: 26.077,
  longitude: 119.225,
};

const sampleUser = {
  id: "user_test",
  nickname: "测试球友",
  avatar: "🏓",
  rankTier: "黄金",
  score: 1500,
};

describe("campus matching service", () => {
  it("resolves a user location to an open campus only when the point is inside the campus fence", () => {
    expect(resolveCampus(insideMainCampus)).toMatchObject({
      id: "fzu_qishan",
      name: "福州大学旗山校区",
    });

    expect(resolveCampus(outsideCampuses)).toBeNull();
  });

  it("allows only in-campus users to enter the lobby", () => {
    resetMatchingStoreForTests();

    const result = enterLobby({
      user: sampleUser,
      location: insideMainCampus,
    });

    expect(result.allowed).toBe(true);
    expect(result.campus?.id).toBe("fzu_qishan");

    const denied = enterLobby({
      user: { ...sampleUser, id: "user_outside" },
      location: outsideCampuses,
    });

    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe("OUTSIDE_OPEN_CAMPUS");
  });

  it("lists only fresh online users from the same campus and hides precise coordinates", () => {
    resetMatchingStoreForTests();
    enterLobby({ user: sampleUser, location: insideMainCampus });

    const users = listLobbyUsers({ campusId: "fzu_qishan" });

    expect(users.some((user) => user.id === sampleUser.id)).toBe(true);
    expect(users[0]).not.toHaveProperty("latitude");
    expect(users[0]).not.toHaveProperty("longitude");
  });

  it("creates broadcasts only for users with a fresh campus presence", () => {
    resetMatchingStoreForTests();

    expect(() =>
      createBroadcast({
        userId: sampleUser.id,
        message: "找一位同校区球友打一场积分赛",
      }),
    ).toThrow("User is not in an active campus lobby");

    enterLobby({ user: sampleUser, location: insideMainCampus });
    const broadcast = createBroadcast({
      userId: sampleUser.id,
      message: "找一位同校区球友打一场积分赛",
      preferredTime: "今天晚上",
    });

    expect(broadcast).toMatchObject({
      campusId: "fzu_qishan",
      message: "找一位同校区球友打一场积分赛",
      status: "active",
    });

    expect(listBroadcasts({ campusId: "fzu_qishan" })).toHaveLength(1);
    expect(listBroadcasts({ campusId: "campus_east" })).toHaveLength(0);
  });

  it("returns only coarse distance labels for broadcasts and supports cancelling", () => {
    resetMatchingStoreForTests();
    enterLobby({ user: sampleUser, location: insideMainCampus });
    createBroadcast({
      userId: sampleUser.id,
      message: "同校区约一场",
    });

    const [broadcast] = listBroadcasts({
      campusId: "fzu_qishan",
      viewerLocation: { latitude: 26.061, longitude: 119.202 },
    });

    expect(broadcast.approxDistance).toMatch(/同校区|约/);
    expect(broadcast).not.toHaveProperty("latitude");
    expect(broadcast).not.toHaveProperty("longitude");

    expect(cancelBroadcast({ userId: sampleUser.id })).toEqual({ cancelled: true });
    expect(listBroadcasts({ campusId: "fzu_qishan" })).toHaveLength(0);
  });

  it("uses a polygon campus boundary instead of a center-radius shortcut", () => {
    expect(isPointInCampusBoundary(insideMainCampus, fuzhouUniversityQishanCampus)).toBe(true);
    expect(isPointInCampusBoundary(outsideCampuses, fuzhouUniversityQishanCampus)).toBe(false);
  });

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

  it("refreshes presence for a user still inside the same campus", () => {
    resetMatchingStoreForTests();
    enterLobby({ user: sampleUser, location: insideMainCampus });

    const result = refreshPresence({
      userId: sampleUser.id,
      location: { latitude: 26.061, longitude: 119.201 },
    });

    expect(result).toEqual({ ok: true });
  });

  it("refreshPresence returns NO_PRESENCE for a user who never entered the lobby", () => {
    resetMatchingStoreForTests();

    const result = refreshPresence({
      userId: "ghost_user",
      location: insideMainCampus,
    });

    expect(result).toEqual({ ok: false, reason: "NO_PRESENCE" });
  });

  it("refreshPresence returns LEFT_CAMPUS when user moved outside the boundary", () => {
    resetMatchingStoreForTests();
    enterLobby({ user: sampleUser, location: insideMainCampus });

    const result = refreshPresence({
      userId: sampleUser.id,
      location: outsideCampuses,
    });

    expect(result).toEqual({ ok: false, reason: "LEFT_CAMPUS" });
  });

  it("refreshPresence removes presence after detecting LEFT_CAMPUS", () => {
    resetMatchingStoreForTests();
    enterLobby({ user: sampleUser, location: insideMainCampus });

    refreshPresence({ userId: sampleUser.id, location: outsideCampuses });

    const retry = refreshPresence({
      userId: sampleUser.id,
      location: insideMainCampus,
    });
    expect(retry).toEqual({ ok: false, reason: "NO_PRESENCE" });
  });

  it("rate-limits enterLobby to 6 calls per 60s window", () => {
    resetMatchingStoreForTests();
    const rateLimitedUser = { ...sampleUser, id: "rate_limit_test_1" };

    for (let i = 0; i < 6; i++) {
      enterLobby({ user: rateLimitedUser, location: insideMainCampus });
    }

    expect(() =>
      enterLobby({ user: rateLimitedUser, location: insideMainCampus }),
    ).toThrow("RATE_LIMITED");
  });

  it("rate-limits refreshPresence to 4 calls per 60s window", () => {
    resetMatchingStoreForTests();
    const rateLimitedUser = { ...sampleUser, id: "rate_limit_test_2" };
    enterLobby({ user: rateLimitedUser, location: insideMainCampus });

    for (let i = 0; i < 4; i++) {
      refreshPresence({
        userId: rateLimitedUser.id,
        location: insideMainCampus,
      });
    }

    expect(() =>
      refreshPresence({
        userId: rateLimitedUser.id,
        location: insideMainCampus,
      }),
    ).toThrow("RATE_LIMITED");
  });

  it("formats a campus boundary as a local TypeScript object snippet", () => {
    const source = formatCampusBoundaryForSource({
      ...fuzhouUniversityQishanCampus,
      provider: "osm",
      providerObjectId: "relation/123",
      sourceLicense: "ODbL",
    });

    expect(source).toContain("provider: \"osm\"");
    expect(source).toContain("providerObjectId: \"relation/123\"");
    expect(source).toContain("sourceLicense: \"ODbL\"");
    expect(source).toContain("boundary:");
  });

});
