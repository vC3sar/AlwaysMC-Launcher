const RPC = require('discord-rpc');
const { clientId } = require('../config.json');

const rawClientId = typeof clientId === 'string' ? clientId.trim() : '';
const hasClientId =
  rawClientId.length > 0 &&
  rawClientId !== 'your_discord_app_client_id_here' &&
  rawClientId !== 'TU_CLIENT_ID_AQUÍ';

let rpc = null;
let missingClientIdWarned = false;

let isReady = false;

function setPresence(ip) {
  if (!hasClientId) {
    if (!missingClientIdWarned) {
      console.log('ℹ️ Discord Rich Presence desactivado: falta un clientId válido en config.json');
      missingClientIdWarned = true;
    }
    return;
  }

  if (!isReady) {
    console.log("⏳ Aún no conectado a Discord, ignorando presencia...");
    return;
  }

  rpc.setActivity({
    details: 'AlwaysMC Launcher',
    state: `Jugando en: ${ip}`,
    startTimestamp: new Date(),
    largeImageKey: 'logo',
    largeImageText: 'AlwaysMC',
    smallImageKey: 'mc',
    smallImageText: 'Minecraft',
    instance: false,
  });
}

if (hasClientId) {
  RPC.register(rawClientId);
  rpc = new RPC.Client({ transport: 'ipc' });

  rpc.on('ready', () => {
    console.log('✅ Rich Presence conectado a Discord');
    isReady = true;
    setPresence('Esperando servidor...');
  });

  rpc.login({ clientId: rawClientId }).catch(console.error);
} else {
  console.log('ℹ️ Rich Presence desactivado hasta configurar config.json');
}

module.exports = { setPresence };
