import { SlashCommandBuilder } from 'discord.js';
import MatchMaker from '../../components/matchmaking.js';
import { createPlayer } from '../../services/players.cjs';
import { getPartyMembers } from '../../services/party.cjs';
import { leaveQueue } from '../../controllers/queue.js';
const create = () => {
    const command = new SlashCommandBuilder()
        .setName('queue')
        .setDescription(
            'Queue'
        )
        .addIntegerOption(option =>
            option.setName('groupsize')
                .setDescription('인원 수')
                .addChoices(
                    {
                        name: '2인',
                        value: 2
                    },
                    {
                        name: '5인',
                        value: 5
                    },
                    {
                        name: '10인',
                        value: 10
                    },
                    {
                        name: '20인',
                        value: 20
                    },
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Specify the Equipment')
                .setRequired(true)
                .addChoices(
                    {
                        name: '헬게',
                        value: 'hg'
                    },
                    {
                        name: '크리스탈',
                        value: 'c'
                    },
                    {
                        name: '크리스탈 아레나',
                        value: 'ca'
                    },
                    {
                        name: '아레나',
                        value: 'a'
                    },

                )
        )
        .setDMPermission(false)

    return command.toJSON();
};

const invoke = async (interaction) => {
    const guild = interaction.guild;
    const size = await interaction.options.getInteger('groupsize')
    const type_str = await interaction.options.getString('type')
    console.log(size, type_str)

    let partymembers = [];
    let members = await getPartyMembers({ playerId: interaction.member.id });

    let res = await Promise.all(
        members.data.map(async v => {
            let roles = [];
            let member = await interaction.guild.members.fetch(v)
            await member.roles.cache.some(r => {
                if (["Tank", "Heal", "RDPS", "MDPS"].includes(r.name)) {
                    roles.push(r.name)
                }
            })
            if (roles.length < 1) {

                await interaction.reply({
                    content: `<@${v}> Please enroll at least one role`
                    , ephemeral: true
                })
                return false;
            }
            partymembers = [
                ...partymembers,
                {
                    id: v,
                    roles
                }
            ]
        })
    )
    console.log('asdf', res)
    if (!res[0]) {
        return;
    }
    if (partymembers.length >= size) {
        return await interaction.reply({ content: 'exceeds queue size', ephemeral: true })
    }

    let created = await createPlayer({ party: partymembers, partyIds: members, type: `${size}:${type_str}` });
    if (!created.status) {
        return await interaction.reply({
            content: created.msg
        })
    }
    console.log(partymembers)

    let { embed, row } = await MatchMaker(interaction, partymembers, size, type_str)
    //console.log(interaction.member)

    await interaction.reply({
        embeds: [embed],
        components: [row]
    })
    setTimeout(async () => {
        try {
            await leaveQueue({ playerId: interaction.member.id })
            interaction.deleteReply()
        } catch (e) {
            console.log(e)
        }
    }, 60000);
    return
};

export { create, invoke };