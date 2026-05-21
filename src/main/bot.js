const path = require("path");

class BotManager {
  constructor() {
    this.botRunner = null;
  }

  async stopBotSession() {
    if (!this.botRunner) return;
    try {
      if (typeof this.botRunner.stop === "function") {
        await this.botRunner.stop();
      }
    } catch (error) {
      console.log(
        "[BotManager] stopBotSession error:",
        error && error.message ? error.message : String(error),
      );
    } finally {
      this.botRunner = null;
    }
  }

  async startBot(profile) {
    if (this.botRunner && typeof this.botRunner.stop === "function") {
      await this.stopBotSession();
    }
    console.log("[BotManager] startBot() requested", {
      username: profile?.username,
      ip: profile?.ip,
      port: profile?.port,
      version: profile?.version,
    });

    const minelightPath = path.join(__dirname, "../../minelight");
    this.botRunner = require(minelightPath)(profile);
    console.log("[BotManager] minelight initialized");
    return { ok: true };
  }
}

module.exports = new BotManager();
