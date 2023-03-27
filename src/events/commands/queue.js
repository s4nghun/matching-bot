import { SlashCommandBuilder } from 'discord.js';
import MatchMaker from '../../components/matchmaking.js';
import { createPlayer } from '../../services/players.cjs';
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
                        value: 'crystal'
                    },
                    {
                        name: '크리스탈 아레나',
                        value: 'carena'
                    },
                    {
                        name: '아레나',
                        value: 'arena'
                    },

                )
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('파티원 추가')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('user1')
                .setDescription('파티원 추가')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('user2')
                .setDescription('파티원 추가')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('user3')
                .setDescription('파티원 추가')
                .setRequired(false))
        .setDMPermission(false)

    return command.toJSON();
};

const invoke = async (interaction) => {
    const guild = interaction.guild;

    let roles = [];

    await interaction.member.roles.cache.some(r => {
        if (["Tank", "Heal", "RDPS", "MDPS"].includes(r.name)) {
            roles.push(r.name)
        }
    })
    if (roles.length < 1) {
        return await interaction.reply({
            content: "Please enroll at least one role"
        })
    }
    let created = await createPlayer({ playerId: interaction.member.id, roles: roles });
    if (!created.status) {
        return await interaction.reply({
            content: created.msg
        })
    }
    console.log(roles)

    let { embed, row } = await MatchMaker(interaction, [
        {
            id: interaction.member.id,
            roles,
        }
    ])
    //console.log(interaction.member)

    return await interaction.reply({
        embeds: [embed],
        components: [row]
    })
    let master = interaction.options.getUser('user')
    let user = await guild.members.cache.get(master.id)
    let memberRole = await guild.roles.cache.find(r => r.name === 'mtc-guild-member');
    let masterRole = await guild.roles.cache.find(r => r.name === 'mtc-guild-master');
    if (user._roles.includes(memberRole.id) || user._roles.includes(masterRole.id)) {
        return await interaction.reply({ content: `User already joined the guild!`, ephemeral: true });
    }

    if (interaction.member.roles.cache.some(role => role.name === 'mtc-guild-master')) {
        try {
            await inviteUser({ userId: master.id, userName: master.username, masterId: interaction.member.id })
            return await interaction.reply({ content: `Successfully invited <@${master.id}> !`, ephemeral: true });
        } catch (e) {
            console.log(e)
            return await interaction.reply({ content: 'Cannot invite tagged user!', ephemeral: true })
        }
    }
    return await interaction.reply({ content: `You are not a guild master!`, ephemeral: true });
};

export { create, invoke };