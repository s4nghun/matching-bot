import { SlashCommandBuilder } from 'discord.js';
import MatchMaker from '../../components/matchmaking.js';
import { createPlayer, findPlayers, removePlayer, updatePlayer } from '../../services/players.cjs';
import { getPartyMembers } from '../../services/party.cjs';
import { leaveQueue } from '../../controllers/queue.js';
import { MMLogic } from '../../utils/matchMake.js';
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
    const guild = interaction.guild;
    const size = await interaction.options.getInteger('groupsize')
    const type_str = await interaction.options.getString('type')

    let partymembers = [];
    let members = await getPartyMembers({ playerId: interaction.member.id });
    
    await Promise.all(
        members.data.map(async v => {
            let roles = [];
            let member = await interaction.guild.members.fetch(v)

            await member.roles.cache.some(r => {
                if (matchTypes[`${size}:${type_str}`].includes(r.name)) {
                    roles=[
                        ...roles,
                        r.name
                    ]
                }
            })

            if (roles.length < 1 || !roles) {

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
    if (partymembers.length >= size) {
        return await interaction.reply({ content: 'exceeds queue size', ephemeral: true })
    }

    let created = await createPlayer({ party: partymembers, partyIds: members, type: `${size}:${type_str}` });
    if (!created.status) {
        return await interaction.reply({
            content: created.msg
        })
    }

    let { embed, row } = await MatchMaker(interaction, partymembers, size, type_str)

    let mmsg = await interaction.reply({
        embeds: [embed],
        components: [row]
    })
    await updatePlayer({playerIds: members.data, messageId: interaction.token, channelId: interaction.channel.id})

    setTimeout(async()=>{
        let mmResult = await MMLogic(size, type_str);
        if (mmResult.status) {
            let playerIds = mmResult.data.map(v=>v.id)
            
//            let messageIds = await findPlayers({group: playerIds}) 

            // await messageIds.map(async v=>{
            //     //let channel = await interaction.guild.channels.cache.get(v.channelId)
            //     //let message = await channel.interactions.fetch(v.messageId)
            //     //console.log(message)
            //     // let int = await interaction.client.fetchInteraction(v.messageId)
            //     // console.log(int)
            //     // .delete().catch(e=>{
            //     //     console.log("couldn't delete")
            //     // })
            // })
            await removePlayer({group: playerIds})
            // interaction.deleteReply().catch(e=>{
            //     console.log("couldn't delete")
            // })
            let val=""
            await mmResult.data.map(v=>{
                val += `${emoji[v.role]} : <@${v.id}> \n`
            })
            return interaction.followUp({content: `MATCHED! \n ${val}`})
        }
    }, 3000)

    setTimeout(async () => {
        try {
            await leaveQueue({ playerId: interaction.member.id })
            interaction.deleteReply().catch(e=>{
                console.log("couldn't delete")
            })
        } catch (e) {
            console.log(e)
        }
    }, 60000);
    return
};

export { create, invoke };