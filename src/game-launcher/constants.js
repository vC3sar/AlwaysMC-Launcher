const MC_MANIFEST_URL = "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";
const FABRIC_GAMES_URL = "https://meta.fabricmc.net/v2/versions/game";
const FABRIC_LOADERS_URL = "https://meta.fabricmc.net/v2/versions/loader";
const FORGE_PROMOS_URL = "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json";
const MS_SCOPES = ["XboxLive.signin", "offline_access", "openid", "profile"];
const MS_DEFAULT_TENANT = "consumers";

module.exports = {
  FABRIC_GAMES_URL,
  FABRIC_LOADERS_URL,
  FORGE_PROMOS_URL,
  MC_MANIFEST_URL,
  MS_DEFAULT_TENANT,
  MS_SCOPES,
};
