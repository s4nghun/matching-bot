import { } from 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import Config from "./src/config/general.js"
import { db } from "./src/models/index.cjs"
import { leaveQueue } from "./src/controllers/queue.js"
import { joinParty } from './src/services/party.cjs';
import ReadyEmbed from './src/components/ready.js';
import { destroySession, findSession, updateSession } from './src/services/session.cjs';

db.sequelize.sync().then(() => { console.log('DB connected') })

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const events = fs
    .readdirSync('./src/events')
    .filter((file) => file.endsWith('.js'));

for (let event of events) {

    const eventFile = await import(`#events/${event}`);
    if (eventFile.once)
        client.once(eventFile.name, (...args) => {
            eventFile.invoke(...args);
        });
    else
        client.on(eventFile.name, (...args) => {
            eventFile.invoke(...args);
        });
}

// client.on(Events.MessageDelete, async interaction =>{
//     if (interaction?.interaction?.id){
//     console.log('deleted', interaction.interaction.id)
//     //let int = await interaction.client.fetchInteraction()
//     }
//     //interaction.client.fetchInteraction()
// })

// 파티 수락 인터렉션
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId != 'selectparty') return;
    const selected = interaction.values[0];
    await joinParty({ playerId: interaction.member.id, partyId: selected })
    await interaction.update({ content: `You joined <@${selected}>'s party!`, components: [] })

});

// 버튼 클릭 인터렉션
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    const info = interaction.customId.split(':');

    //매칭 취소하기
    if (info[0] == "quit") {
        //remove from queue
        if (interaction.member.id != info[1]) {
            return interaction.reply({
                content: 'You are not in current queue',
                ephemeral: true,
            })
        }
        await leaveQueue({ playerId: interaction.member.id })
        await interaction.message.delete();

    } else if (info[0] == "ready") {
        //큐 레디
        interaction.deferUpdate()
        let sessionId = info[1];
        let type_str = info[3];
        let size = info[2];
        let expiry = info[4];
        await updateSession({ status: 1, playerId: interaction.member.id, sessionId });
        let party = await findSession({ sessionId })
        let countReady = 0;
        await Promise.all(
            party.map(v => {
                if (v.status == 1) {
                    countReady++;
                }
            })
        )
        if (countReady == size) {
            await interaction.message.edit({ embeds: [], components: [] })
            return interaction.channel.send({ content: 'need to implement creating channel' })
        }
        let { embed } = await ReadyEmbed({ interaction, party, size, type_str, sessionId, expiry })
        //matched!
        await interaction.message.edit({ embeds: [embed] })
    } else if (info[0] == "cancel") {
        //큐 취소
        let sessionId = info[1];
        await destroySession({ sessionId });
        await interaction.message.delete().catch(() => { console.log('hehe') })
    }
})

client.login(Config.token);