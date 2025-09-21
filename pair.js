const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  Browsers,
  makeCacheableSignalKeyStore,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const { upload } = require('./mega');

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
  const id = makeid();
  let num = req.query.number;

  async function RAHMAN_MD_PAIR() {
    const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
    try {
      let sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "fatal" }).child({ level: "fatal" })
          ),
        },
        printQRInTerminal: false,
        generateHighQualityLinkPreview: true,
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        syncFullHistory: false,
        browser: Browsers.macOS("Safari")
      });

      if (!sock.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, '');
        const code = await sock.requestPairingCode(num);
        if (!res.headersSent) {
          await res.send({ code });
        }
      }

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;

        if (connection == "open") {
          await delay(3000);
          let rf = __dirname + `/temp/${id}/creds.json`;

          if (!fs.existsSync(rf)) {
            await sock.sendMessage(sock.user.id, { text: "❌ creds.json not found!" });
            return;
          }

          // 🔑 Base64 Session
          let credsData = fs.readFileSync(rf, { encoding: "utf-8" });
          let base64Session = Buffer.from(credsData).toString("base64");
          let session_id = "RAHMAN-MD~" + base64Session;

          // ✅ Send Base64 Session First
          await sock.sendMessage(sock.user.id, { text: session_id });

          // 🌐 Try MEGA Upload (Backup)
          let mega_url = "";
          try {
            mega_url = await upload(fs.createReadStream(rf), `${sock.user.id}.json`);
            await sock.sendMessage(sock.user.id, {
              text: `🌐 *MEGA Session Backup:*\n${mega_url}`
            });
          } catch (e) {
            await sock.sendMessage(sock.user.id, { text: "⚠️ MEGA Upload Failed, but base64 session sent." });
          }

          // ✨ Styled Info Message
          let desc = `
*⟢━━━━━━━━━━━━━━━━━━⟣*
   𝐑𝐀𝐇𝐌𝐀𝐍-𝐌𝐃 𝐒𝐄𝐒𝐒𝐈𝐎𝐍 𝐈𝐃
*⟢━━━━━━━━━━━━━━━━━━⟣*

> 🔑  *UNIQUE & CONFIDENTIAL!*  
  ᴋᴇᴇᴘ ɪᴛ sᴀғᴇ - ɴᴇᴠᴇʀ sʜᴀʀᴇ ᴡɪᴛʜ ᴀɴʏᴏɴᴇ.  

> ⚙️ *_ᴜsᴇ ᴏɴʟʏ ғᴏʀ ʀᴀʜᴍᴀɴ-ᴍᴅ ʙᴏᴛ._*  

🚀 You are now part of *RAHMAN-MD Network* 🚀

📡 *BOT RESOURCES*  
🛰️ Official Channel:  
╰ ⌲ https://whatsapp.com/channel/0029VaEV2x85kg7Eid9iK43R  

🔗 Repo Link:  
╰ ⌲ https://github.com/RAHMAN-TECH90/RAHMAN-MD  

👨‍💻 Developer:  
╰ ⌲ https://wa.me/923015954782  
*⟢━━━━━━━━━━━━━━━━━━⟣*
  POWERED BY RAHMAN-MD
*⟢━━━━━━━━━━━━━━━━━━⟣*
`;

          await sock.sendMessage(sock.user.id, {
            text: desc,
            contextInfo: {
              externalAdReply: {
                title: "𝐑𝐀𝐇𝐌𝐀𝐍-𝐓𝐄𝐂𝐇",
                thumbnailUrl: "https://files.catbox.moe/84jssf.jpg",
                sourceUrl: "https://whatsapp.com/channel/0029VaEV2x85kg7Eid9iK43R",
                mediaType: 1,
                renderLargerThumbnail: true
              }
            }
          });

          console.log(`✅ Session sent to ${sock.user.id}`);
          await delay(5000);
          await sock.ws.close();
          await removeFile('./temp/' + id);
          process.exit();
        } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode != 401) {
          await delay(10);
          RAHMAN_MD_PAIR();
        }
      });
    } catch (err) {
      console.log("Service restarted due to error:", err);
      await removeFile('./temp/' + id);
      if (!res.headersSent) {
        await res.send({ code: "❗ Service Unavailable" });
      }
    }
  }

  return await RAHMAN_MD_PAIR();
});

module.exports = router;
