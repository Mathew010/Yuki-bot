const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
let antilinkDB = {}
async function startBot(){
const { state, saveCreds } = await useMultiFileAuthState('auth')
const sock = makeWASocket({auth: state, logger: P({level: 'silent'}), printQRInTerminal: true, browser: ['Yuki','Chrome','1.0']})
sock.ev.on('creds.update', saveCreds)
sock.ev.on('connection.update', u=>{
if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot()
})
sock.ev.on('messages.upsert', async ({messages})=>{
try{
const msg = messages[0]
if(!msg.message || msg.key.fromMe) return
const from = msg.key.remoteJid
if(!from.endsWith('@g.us')) return
const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ''
if(!text.startsWith('.')) return
const args = text.trim().split(/ +/)
const command = args[0].toLowerCase()
const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || []
const meta = await sock.groupMetadata(from)
const isBotAdmin = !!meta.participants.find(p=>p.id===sock.user.id)?.admin
const sender = meta.participants.find(p=>p.id===msg.key.participant)
const isAdmin = !!sender?.admin
if(antilinkDB[from] && /https?:\/\/|wa\.me|chat\.whatsapp/i.test(text) && !isAdmin && isBotAdmin){
await sock.sendMessage(from, {delete: msg.key})
return sock.sendMessage(from, {text: `🚫 link no permitido`})
}
if(command==='.kick'){
if(!isAdmin) return sock.sendMessage(from,{text:'❌ Solo admins'})
if(!isBotAdmin) return sock.sendMessage(from,{text:'❌ Hazme admin'})
if(!mentioned[0]) return sock.sendMessage(from,{text:'Usa: .kick @usuario'})
await sock.groupParticipantsUpdate(from, mentioned, "remove")
return sock.sendMessage(from,{text:'✅ Eliminado'})
}
if(command==='.todos' || command==='.tagall'){
if(!isAdmin) return
let txt = args.slice(1).join(' ') || '📢 ATENCION'
let mentions = meta.participants.map(p=>p.id)
return sock.sendMessage(from,{text: txt + '\n' + mentions.map(m=>'@'+m.split('@')[0]).join(' '), mentions})
}
if(command==='.antilink'){
if(!isAdmin) return
if(args[1]==='on'){antilinkDB[from]=true; return sock.sendMessage(from,{text:'✅ Antilink ON'})}
if(args[1]==='off'){antilinkDB[from]=false; return sock.sendMessage(from,{text:'❌ Antilink OFF'})}
return sock.sendMessage(from,{text:'Usa: .antilink on/off'})
}
if(command==='.menu'){
return sock.sendMessage(from,{text:`🤖 YUKI BOT\n\n.kick @user\n.todos texto\n.antilink on/off\n.link\n.abrir / .cerrar`})
}
if(command==='.abrir'){await sock.groupSettingUpdate(from,'not_announcement'); return sock.sendMessage(from,{text:'🔓 Abierto'})}
if(command==='.cerrar'){await sock.groupSettingUpdate(from,'announcement'); return sock.sendMessage(from,{text:'🔒 Cerrado'})}
if(command==='.link'){let code = await sock.groupInviteCode(from); return sock.sendMessage(from,{text:`https://chat.whatsapp.com/${code}`})}
}catch(e){console.log(e)}
})
}
startBot()
