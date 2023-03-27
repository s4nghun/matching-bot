import { SlashCommandBuilder } from 'discord.js';
import MatchMaker from '../../components/matchmaking.js';
import { createPlayer } from '../../services/players.cjs';
import { getPartyMembers } from '../../services/party.cjs';
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
    let members = await getPartyMembers({playerId: interaction.member.id});
    console.log(members)
    await Promise.all(
        members.data.map(async v=>{
            let roles = [];
            let member = await interaction.guild.members.fetch(v)
            await member.roles.cache.some(r => {
                if (["Tank", "Heal", "RDPS", "MDPS"].includes(r.name)) {
                    roles.push(r.name)
                }
            })
            if (roles.length < 1) {
                return await interaction.reply({
                    content: `<@${v}>Please enroll at least one role`
                })
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
    
    let created = await createPlayer({ party: partymembers, partyIds: members, type: `${size}:${type_str}` });
    if (!created.status) {
        return await interaction.reply({
            content: created.msg
        })
    }
    console.log(partymembers)

    let { embed, row } = await MatchMaker(interaction, partymembers)
    //console.log(interaction.member)

    return await interaction.reply({
        embeds: [embed],
        components: [row]
    })
};

export { create, invoke };