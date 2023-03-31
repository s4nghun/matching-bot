import { } from 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits, Events, ChannelType } from 'discord.js';
import Config from "./src/config/general.js"
import { db } from "./src/models/index.cjs"
import { leaveQueue } from "./src/controllers/queue.js"
import { joinParty } from './src/services/party.cjs';
import ReadyEmbed from './src/components/ready.js';
import { destroySession, findSession, updateSession } from './src/services/session.cjs';

import matchType from "./src/data/matchTypes.json" assert {type: "json"}

db.sequelize.sync().then(() => { console.log('DB connected') })

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
        , GatewayIntentBits.GuildMessages
        , GatewayIntentBits.MessageContent
        , GatewayIntentBits.GuildVoiceStates
    ]
});

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

client.on('voiceStateUpdate', (oldState, newState) => {
    // check for bot
    if (oldState.member.user.bot) return;
    let oldCount = oldState?.channel?.members.size || 0;
    let newCount = newState.channel?.members.size || 0;
    // the rest of your code
    console.log('oldState', oldState?.channel?.members.size || 0)
    console.log('newState', newState.channel?.members.size || 0)
    //console.log('newState', newState)//.channel.members.size)
    try {
        if (newCount == 0) {
            // console.log(oldState.channel)
            console.log('error', oldState?.channel?.parentId, oldCount)
            if (oldState?.channel?.parentId == "1060737713063612489") {
                oldState.channel.delete();
            }
        }
    } catch (e) {
        console.log(e)
        console.log('error', newState, oldCount)
        if (oldState?.channel?.parentId == "1060737713063612489" && oldCount == 0) {
            oldState.channel.delete();
        }
    }
})

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
            let { embed, content } = await ReadyEmbed({ interaction, party, size, type_str, sessionId, expiry })
            console.log(content)
            await interaction.message.edit({ content, embeds: [embed], components: [] })

            let partyCh = await interaction.guild.channels.create({
                name: `${interaction.member.displayName}-${size}v${size} ${matchType[type_str]}`,
                type: ChannelType.GuildVoice,
                parent: "1060737713063612489",
                // your permission overwrites or other options here
            });

            let timeout = setTimeout(function () {
                //console.log(partyCh);
                partyCh.delete();
            }, 30000);
            client.on("voiceStateUpdate", (oldState, newState) => {
                clearTimeout(timeout);
            })
            let invite = await partyCh.createInvite(
                {
                    maxAge: 10 * 60 * 1000, // maximum time for the invite, in milliseconds
                    maxUses: 10 // maximum times it can be used
                },
                `Party Channel created`
            )
                .catch(console.log);

            return interaction.channel.send({ content: `${content}\n${invite}` })
        }
        let { embed } = await ReadyEmbed({ interaction, party, size, type_str, sessionId, expiry })
        //matched!
        await interaction.message.edit({ embeds: [embed] })
    } else if (info[0] == "cancel") {
        //큐 취소
        let sessionId = info[1];
        await destroySession({ sessionId });

        //취소한 사람은 큐에서 제거 해야함 [필요]

        await interaction.message.delete().catch(() => { console.log('hehe') })
    }
})

client.login(Config.token);