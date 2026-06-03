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
