const RPC = require('discord-rpc');
const { clientId } = require('../config.json');

RPC.register(clientId);
const rpc = new RPC.Client({ transport: 'ipc' });

let isReady = false;

function setPresence(ip) {
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

rpc.on('ready', () => {
  console.log('✅ Rich Presence conectado a Discord');
  isReady = true;
  setPresence('Esperando servidor...');
});

rpc.login({ clientId }).catch(console.error);

module.exports = { setPresence };
