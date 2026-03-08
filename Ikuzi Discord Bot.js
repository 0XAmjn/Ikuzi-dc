const { Client, GatewayIntentBits, EmbedBuilder, Partials } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// --- KONFIGURATION (DIREKT EINGEBETTET) ---
// Da keine .env Datei unterstützt wird, tragen wir die Werte hier direkt ein.
const SUPABASE_URL = "https://iryzynxbnguhtlwrztwo.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "sb_secret_m76PUx..."; // Ersetze dies durch deinen tatsächlichen Secret Key
const DISCORD_TOKEN = "MTQ4MDE3NzQ0MzU1Mjg5MTA1NQ.GBjAd5..."; // Ersetze dies durch deinen tatsächlichen Bot Token
const PROOF_CHANNEL_ID = "1444335751012552876";

// Initialisierung Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialisierung Discord Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', () => {
    console.log(`Loging erfolgt als ${client.user.tag}!`);
    console.log('Ikuzi Bot ist bereit für den Einsatz.');
});

// --- EVENT: NACHRICHTEN VERARBEITEN (PROOFS) ---
client.on('messageCreate', async (message) => {
    // Ignoriere Bots
    if (message.author.bot) return;

    // Logik für den Proof-Channel
    if (message.channelId === PROOF_CHANNEL_ID) {
        if (message.attachments.size > 0) {
            console.log(`Neuer Proof von ${message.author.username} erkannt.`);
        }
    }

    // --- COMMANDS ---
    if (!message.content.startsWith('!')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Command: !status [modul] [status]
    if (command === 'status') {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('Du hast keine Berechtigung, den Systemstatus zu ändern.');
        }

        const module = args[0]; // advanced, uefi, private
        const newStatus = args[1]; // undetected, detected, maintenance

        if (!['advanced', 'uefi', 'private'].includes(module) || !newStatus) {
            return message.reply('Benutzung: `!status [advanced|uefi|private] [status]`');
        }

        const updateData = {};
        updateData[`${module}_status`] = newStatus;
        updateData['last_update'] = new Date();

        const { error } = await supabase
            .from('system_status')
            .update(updateData)
            .eq('id', 1);

        if (error) {
            console.error('DB Error:', error);
            message.reply('Fehler beim Aktualisieren der Datenbank.');
        } else {
            const embed = new EmbedBuilder()
                .setTitle('System Status Aktualisiert')
                .setDescription(`Modul **${module}** ist nun auf **${newStatus}** gesetzt.`)
                .setColor(newStatus === 'undetected' ? 0x00ff00 : 0xff0000)
                .setTimestamp();
            
            message.channel.send({ embeds: [embed] });
        }
    }

    // Command: !profile
    if (command === 'profile') {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('discord_id', message.author.id)
            .single();

        if (error || !data) {
            return message.reply('Kein Profil in der Datenbank gefunden. Bitte logge dich zuerst auf der Webseite ein.');
        }

        const embed = new EmbedBuilder()
            .setTitle(`Profil von ${data.username}`)
            .addFields(
                { name: 'User ID', value: data.id, inline: true },
                { name: 'Zuletzt Online', value: new Date(data.last_login).toLocaleString(), inline: true }
            )
            .setThumbnail(data.avatar_url)
            .setColor(0x5d78ff);

        message.channel.send({ embeds: [embed] });
    }
});

// --- AUTOMATISCHE SYNCHRONISIERUNG ---
client.on('guildMemberAdd', async (member) => {
    const { error } = await supabase
        .from('profiles')
        .update({ is_on_discord_server: true })
        .eq('discord_id', member.id);
    
    if (error) console.error('Error updating member status:', error);
});

client.login(DISCORD_TOKEN);
