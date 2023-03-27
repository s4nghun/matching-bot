import { } from 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import Config from "./src/config/general.js"
import LeaderBoard from './src/components/leaderBoard.js';
import { db } from "./src/models/index.cjs"

db.sequelize.sync().then(() => { console.log('DB connected') })

// Create a new Client with the Guilds intent
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Fetch all js files in ./events
const events = fs
    .readdirSync('./src/events')
    .filter((file) => file.endsWith('.js'));

// Check for an event and execute the corresponding file in ./events
for (let event of events) {
    // The #events ES6 import-abbreviation is defined in the package.json
    // Note that the entries in the list of files (created by readdirSync) end with .js,
    // so the abbreviation is different to the #commands abbreviation
    const eventFile = await import(`#events/${event}`);
    // But first check if it's an event emitted once
    if (eventFile.once)
        client.once(eventFile.name, (...args) => {
            eventFile.invoke(...args);
        });
    else
        client.on(eventFile.name, (...args) => {
            eventFile.invoke(...args);
        });
}

client.on(Events.MessageCreate, async message => {
    if (message.content.startsWith('$fight')) {
        (await import(`#commands/fight`)).invoke(message);
    }
});

client.on(Events.MessageUpdate, async (interaction) => {
    if (interaction.author.id != '292953664492929025') return;
    if (interaction?.embeds[0]?.data?.author?.name.indexOf('#') < 0) return;

    let user = await interaction.guild.members.cache.find(u => u.user.tag == interaction.embeds[0].data.author.name)
    if (!user) return;

    await fetchAndPush({ interaction, discordId: user.id })
})

//Select Guild
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId != 'selectguild') return;
    const selected = interaction.values[0];
    const count = await countMember({ guildId: selected });
    if (Number(count) >= 15) {
        return interaction.reply({ content: "Selected guild is full", ephemeral: true })
    }
    const select = interaction.label;
    let guildName = await getGuildNameById({ id: selected })
    let memberRoleId = await getMemberRole()
    let roleId = await acceptInvite({ userId: interaction.member.id, guildId: selected })
    let role = await interaction.guild.roles.cache.find(r => r.id === roleId);
    let memberrole = await interaction.guild.roles.cache.find(r => r.id === memberRoleId);

    await interaction.member.roles.add(role)
    await interaction.member.roles.add(memberrole)

    await interaction.update({ content: `You chose **${guildName}** Guild!`, components: [] })

});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    const info = interaction.customId.split(':');
    let page;
    if (info[1] == 'single') {
        if (info[0] == 'next') {
            page = Number(info[2]) + 1
        } else if (info[0] == 'prev') {
            page = Number(info[2]) - 1
        }
        const { embed, row } = await LeaderBoard(interaction, page, 'single');
        await interaction.update({
            embeds: [embed],
            components: [row]
        })
    } else if (info[1] == 'guild') {
        if (info[0] == 'next') {
            page = Number(info[2]) + 1
        } else if (info[0] == 'prev') {
            page = Number(info[2]) - 1
        }
        const { embed, row } = await LeaderBoard(interaction, page, 'guild');
        await interaction.update({
            embeds: [embed],
            components: [row]
        })
    }

})
// Login with the environment data

client.login(Config.token);