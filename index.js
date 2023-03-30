import { } from 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import Config from "./src/config/general.js"
import { db } from "./src/models/index.cjs"
import { leaveQueue } from "./src/controllers/queue.js"
import { joinParty } from './src/services/party.cjs';

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
    console.log("인터렉션 클릭함")
    if (!interaction.isButton()) return;
    const info = interaction.customId.split(':');

    //매칭 취소하기
    if (info[0] == "quit") {
        //remove from queue
        await leaveQueue({ playerId: interaction.member.id })
        await interaction.message.delete();

    }
})

client.login(Config.token);