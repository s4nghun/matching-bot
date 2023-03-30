import { SlashCommandBuilder } from 'discord.js';
import MatchMaker from '../../components/matchmaking.js';
import { createPlayer, findPlayers, removePlayer, updatePlayer } from '../../services/players.cjs';
import { getPartyMembers } from '../../services/party.cjs';
import { leaveQueue } from '../../controllers/queue.js';
import { MMLogic } from '../../utils/matchMake.js';
import fetch from 'node-fetch';
import matchTypes from "../../data/typeRoles.json" assert { type: "json" };
import emoji from "../../data/emoji.json" assert { type: "json" };
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
    await interaction.deferReply();
    const size = await interaction.options.getInteger('groupsize')
    const type_str = await interaction.options.getString('type')
    console.log(`${size}:${type_str}`)
    // let data = fetch("./src/data/typeRoles.json")
    // console.log(data)
    const groupRoles = {
        "2:hg": ["Heal", "RDPS"],
        "5:hg": ["Tank", "Heal", "RDPS", "MDPS"],
        "10:hg": [],
        "5:c": ["Tank", "Heal", "RDPS", "MDPS"],
        "20:c": [],
        "5:ca": ["Tank", "Heal", "RDPS", "MDPS"],
        "5:a": ["Tank", "Heal", "RDPS", "MDPS"]
    }

    let partymembers = [];
    let members = await getPartyMembers({ playerId: interaction.member.id });
    let invalidPlayers = []
    await Promise.all(
        members.data.map(async v => {
            let roles = [];
            let member = await interaction.guild.members.fetch(v)

            await Promise.all(
                member.roles.cache.map(r => {
                    console.log("역할들", groupRoles, r.name)
                    if (matchTypes[`${size}:${type_str}`].includes(r.name)) {
                        console.log(r.name)
                        roles = [
                            ...roles,
                            r.name
                        ]
                    }
                })
            )

            if (roles.length < 1) {
                console.log(roles)
                invalidPlayers = [
                    ...invalidPlayers,
                    v
                ]

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
    if (invalidPlayers.length > 0) {
        console.log(invalidPlayers)
        await interaction.editReply({ content: `Unable to load position information. `, ephemeral: true })
        return
    }
    if (partymembers.length >= size) {
        return await interaction.editReply({ content: 'exceeds queue size', ephemeral: true })
    }

    let created = await createPlayer({ party: partymembers, partyIds: members, type: `${size}:${type_str}` });
    if (!created.status) {
        return await interaction.editReply({ content: created.msg, ephemeral: true })
    }

    let { embed, row } = await MatchMaker(interaction, partymembers, size, type_str)

    await interaction.deleteReply();
    let mmsg = await interaction.channel.send({
        embeds: [embed],
        components: [row]
    })
    await updatePlayer({ playerIds: members.data, messageId: mmsg.id, channelId: interaction.channel.id })


    let mmResult = await MMLogic(size, type_str);
    if (mmResult.status) {
        let playerIds = mmResult.data.map(v => v.id)

        let messageIds = await findPlayers({ group: playerIds })
        let filtered = messageIds
        filtered.map(async v => {
            try {
                let channel = await interaction.guild.channels.cache.get(v.channelId)
                let message = await channel.messages.fetch(v.messageId)
                message.delete().then(() => {
                    console.log('deleted')
                }).catch(e => {
                    console.log("couldn't delete")
                })
            } catch (e) {
                console.log('message not found')
            }
        })
        await removePlayer({ group: playerIds })
        let val = ""
        await mmResult.data.map(v => {
            val += `${emoji[v.role]} : <@${v.id}> \n`
        })
        return interaction.channel.send({ content: `MATCHED! \n ${val}` })
    }


    setTimeout(async () => {
        try {
            await leaveQueue({ playerId: interaction.member.id })
            let channel = await interaction.guild.channels.cache.get(interaction.channel.id)
            let message = await channel.messages.fetch(mmsg.id)
            message.delete().catch(e => {
                console.log("couldn't delete")
            })
        } catch (e) {
            console.log(e)
        }
    }, 600000);
    return
};

export { create, invoke };