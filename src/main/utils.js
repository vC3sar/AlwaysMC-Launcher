const fs = require("fs");

function parseHostAndPort(hostInput, portInput, defaultServer = "mc.haliacraft.com") {
  const rawHost = String(hostInput ?? "").trim();
  const fallbackHost = defaultServer;
  const rawPort = String(portInput ?? "").trim();
  const hostMatch = rawHost.match(/^\[(.+)\]:(\d+)$/) || rawHost.match(/^([^:]+):(\d+)$/);

  if (hostMatch) {
    return {
      ip: hostMatch[1].trim() || fallbackHost,
      port: Number.parseInt(hostMatch[2], 10) || 25565,
    };
  }

  return {
    ip: rawHost || fallbackHost,
    port: Number.parseInt(rawPort || "25565", 10) || 25565,
  };
}

function loadJsonSafe(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
  parseHostAndPort,
  loadJsonSafe,
  saveJson,
};
