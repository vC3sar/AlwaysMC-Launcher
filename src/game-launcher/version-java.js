function parseMinecraftVersionInfo(versionId) {
  const raw = String(versionId || "").trim();
  const m = raw.match(/^1\.(\d+)(?:\.(\d+))?/);
  if (!m) return { major: null, minor: null, patch: null, raw };
  return {
    major: 1,
    minor: Number.parseInt(m[1], 10),
    patch: Number.parseInt(m[2] || "0", 10),
    raw,
  };
}

function recommendedJavaMajorForVersion(versionId) {
  const v = parseMinecraftVersionInfo(versionId);
  if (v.minor === null) return 21;
  if (v.minor <= 16) return 8;
  if (v.minor === 17) return 16;
  if (v.minor === 18 || v.minor === 19) return 17;
  if (v.minor === 20) return v.patch >= 5 ? 21 : 17;
  if (v.minor >= 21) return 21;
  return 17;
}

function detectJavaMajorFromPathOrLabel(text) {
  const hay = String(text || "").toLowerCase();
  const jdkLike = hay.match(/jdk[-_]?([0-9]{1,2})/);
  if (jdkLike) return Number.parseInt(jdkLike[1], 10);
  const temurinLike = hay.match(/temurin[-_]?([0-9]{1,2})/);
  if (temurinLike) return Number.parseInt(temurinLike[1], 10);
  if (hay.includes("1.8")) return 8;
  const javaLike = hay.match(/java[-_ ]([0-9]{1,2})/);
  if (javaLike) return Number.parseInt(javaLike[1], 10);
  return null;
}

module.exports = {
  detectJavaMajorFromPathOrLabel,
  parseMinecraftVersionInfo,
  recommendedJavaMajorForVersion,
};
