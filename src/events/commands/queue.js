import { SlashCommandBuilder } from 'discord.js';
import MatchMaker from '../../components/matchmaking.js';
import { createPlayer, findPlayers, removePlayer, updatePlayer } from '../../services/players.cjs';
import { getPartyMembers } from '../../services/party.cjs';
import { leaveQueue } from '../../controllers/queue.js';
import { MMLogic } from '../../utils/matchMake.js';
import { nanoid } from 'nanoid'

import matchTypes from "../../data/typeRoles.json" assert { type: "json" };
import emoji from "../../data/emoji.json" assert { type: "json" };
import { createSession, destroySession, findSession } from '../../services/session.cjs';
import ReadyEmbed from '../../components/ready.js';
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
                    if (matchTypes[`${size}:${type_str}`].includes(r.name)) {
                        roles = [
                            ...roles,
                            r.name
                        ]
                    }
                })
            )

            if (roles.length < 1) {
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


        //모든 메세지들을 가져와 삭제합니다.
        let messageIds = await findPlayers({ group: playerIds })
        let filtered = messageIds


        await Promise.all(
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
        )


        // 큐에서 플레이어들을 제거합니다.
        await removePlayer({ group: playerIds })
        let val = ""
        let sessionQuery = [];
        let sessionId = nanoid()
        await Promise.all(
            mmResult.data.map(v => {
                sessionQuery = [
                    ...sessionQuery,
                    {
                        sessionId,
                        playerId: v.id,
                        role: v.role,
                        type: `${size}:${type_str}`,
                        status: 0
                    }
                ]
                val += `${emoji[v.role]} : <@${v.id}> \n`
            })
        )
        // 매칭 성공된 세션을 db에 기록합니다.
        await createSession({ data: sessionQuery })

        //메세지를 만듭니다.
        let ready = await ReadyEmbed({
            party: sessionQuery,
            size,
            type_str,
            sessionId,
            expiry: false
        })
        //메세지를 전송합니다.

        let message = await interaction.channel.send({ content: ready.content, embeds: [ready.embed], components: [ready.row] });
        setTimeout(async () => {
            try {
                //취소한 사람은 큐에서 제거 해야함 [필요]
                let ignored = await findSession({ sessionId });
                let sessionPlayers = ignored.map(v => (v.status == 0) && v.playerId);
                console.log(sessionPlayers)
                let countReady = 0;
                await ignored.map(v => {
                    if (v.status == 1) {
                        countReady++;
                    }
                })
                if (countReady == size) { return; }
                await removePlayer({ group: sessionPlayers })
                message.delete()
                    .then(async () => {
                        await interaction.channel.send({ content: ready.content + `\n\nSession has expired` });
                        await destroySession({ sessionId });
                    })
                    .catch(e => {
                        console.log("couldn't delete")
                    })


            } catch (e) {
                console.log("already deleted")
            }
        }, 60000);
        return
    }


    setTimeout(async () => {
        try {
            await leaveQueue({ playerId: interaction.member.id })
            mmsg.delete().catch(e => {
                console.log("couldn't delete")
            })
        } catch (e) {
            console.log("already deleted")
        }
    }, 600000);
    return
};

export { create, invoke };