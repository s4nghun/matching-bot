import { } from 'dotenv/config';
import fs from 'fs';
import { ActionRowBuilder, ButtonBuilder, AttachmentBuilder, Client, GatewayIntentBits, Events, EmbedBuilder, ButtonStyle, ContextMenuCommandAssertions } from 'discord.js';
import Config from "./src/config/config.js"

//import {  } from '@discordjs/builders';
import pkg from './src/models/index.cjs';
const { db, Sequelize } = pkg;
const { Op } = Sequelize
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { changePoint } from "./src/services/users.service.cjs"
import gif from "gif-frames"
import Canvas from '@napi-rs/canvas';
import { GlobalFonts } from '@napi-rs/canvas';

GlobalFonts.registerFromPath('./SansSerif.ttf', 'sans-serif')

//const ResultChannel = '1062659412164100136';
//const raidChannels = ['1060866516490403903', '1061134158103064606', '1061948837901651968', '1062659412164100136']
// Create a new Client with the Guilds intent
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

var delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function sRepeater(type) {
    let groupInfo = await db['monster_group'].findOne({
        where: {
            type: type
        }
    });

    await delay(Math.ceil((Number(groupInfo.cooldown) - Number(groupInfo.timeLimit)) / 2))
    let channels = await db['config'].findAll({ where: { type: 'RAID_CHANNEL' } });
    let { value: ResultChannel } = await db['config'].findOne({ where: { type: 'RAID_RESULT_CHANNEL' } });
    //let ResultChannel = result.value

    let raidChannels = await channels.map(v => v.value)

    let monsterInfo = await db['monsters'].findOne({
        where: {
            type: type
        },
        order: Sequelize.literal('rand()')
    })

    try {
        let { sessionId, messageId, channelId } = await spawnMonster(
            client,
            monsterInfo.imageId,
            monsterInfo.bgId,
            Number(groupInfo.maxLimit),
            raidChannels[getRandomInt(raidChannels.length)],
            Number(groupInfo.timeLimit),
            type,
            groupInfo.point,
            monsterInfo.name
        )
        await delay(Number(groupInfo.timeLimit))


        let sessionInfo = await db['hunt_sessions'].findOne({ where: { sessionId } });
        if (sessionInfo.count < groupInfo.maxLimit) {
            let channel = await client.channels.cache.get(channelId)
            let msg = await channel.messages.fetch(messageId)
            if (msg) {
                await msg.delete()
                //send Failed message
                let { embed, attachment } = await createResult(sessionId, monsterInfo.imageId, monsterInfo.bgId, true, groupInfo.point, monsterInfo.name)

                await client.channels.cache
                    .get(ResultChannel)
                    .send({
                        embeds: [embed],
                        files: [attachment]
                    });
            }
        }
        await delay(Math.ceil((Number(groupInfo.cooldown) - Number(groupInfo.timeLimit)) / 2))
        return await sRepeater(type)
    } catch (err) {
        console.log(err)
        await delay(Number(groupInfo.cooldown) - Number(groupInfo.timeLimit))
        return await sRepeater(type)

    }
}


client.on(Events.ClientReady, async (clientObj) => {
    if (clientObj.isReady()) {
        console.log('Client Ready')
        sRepeater('s')
        sRepeater('m')
        sRepeater('b')

    }
})

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (!interaction.isButton()) return;

        let slices = interaction.customId.split(":");
        if (slices[0] != "attack") return;
        let postsessionInfo = await db['hunt_sessions'].findOne({
            where: { sessionId: slices[1] },
        })

        let embed_prev = await interaction.message.embeds[0];
        let quiz_embed = await interaction.message.embeds[1];
        let expiry = embed_prev.fields[3].value;
        if (expiry.slice(3, -3) < moment().unix()) {
            return interaction.reply({ content: 'Enemy is fading away', ephemeral: true })
        }
        let count = await db['hunt_log'].count({
            where: {
                participant: interaction.member.id,
                session: slices[1]
            }
        })
        if (count > 0) {
            return await interaction.reply({ content: 'Already attacked', ephemeral: true })
        }
        let res = await db['hunt_sessions'].increment({
            count: 1
        }, {
            where: {
                sessionId: slices[1],
                count: { [Op.lt]: slices[4] }
            }
        });
        if (res[0][1] == 0) {
            try {
                return await interaction.reply({ content: 'expired', ephemeral: true })
            } catch (e) {
                console.log("err() cannot post expired after interaction deleted")
                return;
            }
        }
        if (postsessionInfo.id) {

            if (postsessionInfo.id != slices[6]) {
                try {
                    await changePoint({ interaction, discordId: interaction.member.id, amount: -100 });
                    return await interaction.reply({ content: 'Wrong answer -100 coin!', ephemeral: true })
                } catch (e) {
                    console.log("err() already gone", e);
                    return;
                }
            }
        } else {
            console.log('id not found')
            return;
        }
        await db['hunt_log'].create({
            session: slices[1],
            participant: interaction.member.id
        })
        try {
            interaction.deferUpdate();
        } catch (e) {
            console.log('deferUpdate failed')
        }
        let sessionInfo = await db['hunt_sessions'].findOne({
            where: { sessionId: slices[1] },
            include: {
                model: db['monster_group'],
                as: "type_monster_group"
            }
        })
        if ((slices[4] - Number(sessionInfo.count)) < 1) {
            let { value: ResultChannel } = await db['config'].findOne({ where: { type: 'RAID_RESULT_CHANNEL' } });

            let { embed, attachment } = await createResult(slices[1], slices[2], slices[3], false, sessionInfo?.type_monster_group?.point, slices[5])
            let a = await client.channels.cache
                .get(ResultChannel)
                .send({
                    embeds: [embed],
                    files: [attachment]
                });
            try {
                await closePoints(slices[1], interaction)
            } catch (e) {
                console.log('err(interaction create) failed to close Points')
                return;
            }
            try {
                await interaction.message.delete()
            } catch (e) {
                console.log('delete failed')
                return;
            }
            return
        }

        embed_prev.data.fields[2].value = `( **${slices[4] - Number(sessionInfo.count)}** / **${slices[4]}** )`

        await interaction.message.edit({ embeds: [embed_prev, quiz_embed], files: [] })
    } catch (err) {
        console.log("error on creating interaction", err)
    }
})

async function closePoints(sessionId, interaction) {
    try {
        let huntInfo = await db['hunt_sessions'].findOne({
            where: { sessionId: sessionId },
            include: [
                {
                    model: db['hunt_log'],
                    as: "hunt_logs"
                }, {
                    model: db['monster_group'],
                    as: "type_monster_group"
                }
            ]
        });
        await Promise.all(
            huntInfo?.hunt_logs.map(async v => {
                await changePoint({ interaction, discordId: v.participant, amount: huntInfo?.type_monster_group?.point });

            })
        )
    } catch (e) {
        console.log("err(closePoints) ", sessionId, e)
    }
}

async function createResult(sessionId, monsterId, bgId, isFailed, bounty, name) {
    let cover = 1;
    if (isFailed) {
        cover = 2
    }
    const attachment = await generateImage(monsterId, bgId, cover)
    const result = await db['hunt_log'].findAll({ where: { session: sessionId } })
    let values = ''
    if (result.length > 0) {
        result.map(v => {
            values += `<@${v.participant}> \n`
        })
    } else {
        values = 'None'
    }
    const embed = new EmbedBuilder()
        .setTitle(isFailed ? "MISSION FAILED" : "MISSION COMPLETE")
        .setThumbnail(`attachment://${monsterId}.png`)
        .setFields(
            { name: "Name", value: `**${name}**` },
            { name: "Participants", value: values },
            { name: "Bounty", value: `**${bounty}** <:coin:1062542965962194994>` }
        )
        .setColor(isFailed ? 'Red' : 'Green')

    return { embed, attachment }
}

const TYPE_TO_COLOR = {
    's': 'Grey',
    'm': 'Blue',
    'b': 'Yellow'
}
async function spawnMonster(clientObj, monsterId, bgId, maxHealth, channel, timeLimit, type, bounty, name) {
    const { embed, attachment } = await generateEmbed(monsterId, bgId, maxHealth, maxHealth, timeLimit, bounty, name)
    embed.setColor(TYPE_TO_COLOR[type])
    const uuid = uuidv4().toString()
    const { quizEmbed, quizAttachment, answer } = await generateQuizEmbed(uuid)
    const rows = await generateRows(uuid, monsterId, bgId, maxHealth, name, answer)
    let a = await clientObj.channels.cache
        .get(channel)
        .send({
            embeds: [embed, quizEmbed],
            files: [attachment, quizAttachment],
            components: [rows]
        });
    await db['hunt_sessions'].create({
        id: answer,
        sessionId: uuid,
        type: type,
        count: 0,
        expiry: Number(moment().unix()) + 30,
        messageId: a.id
    })

    return { sessionId: uuid, messageId: a.id, channelId: channel }

}

function adjustSizePos(size, imageWidth, imageHeight) {
    let width, height = size;
    let px = 0;
    let py = 0;
    if (imageWidth > imageHeight) {
        width = size;
        height = Math.ceil(imageHeight * size / imageWidth)
        py = Math.ceil(size - height) / 2 | 0
        px = 0
    } else {
        height = size;
        width = Math.ceil(imageWidth * 700 / imageHeight)
        px = Math.ceil(size - width) / 2 | 0
        py = 0
    }

    return { px, py, width, height }

}

async function generateImage(monsterId, bg, cover = 0) {
    const monster = await Canvas.loadImage(`./assets/${monsterId}.gif`)
    const background = await Canvas.loadImage(`./assets/bg/${bg}.png`)
    //const attatchment = new AttachmentBuilder('./assets/S1.gif', {name: 'S1.gif'})
    const canvas = Canvas.createCanvas(700, 700);

    const context = canvas.getContext('2d');
    context.webkitImageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.imageSmoothingEnabled = false;
    const { px, py, width, height } = await adjustSizePos(700, monster.width, monster.height)
    if (cover != 0) {
        context.filter = 'grayscale(1)';
    }
    context.drawImage(background, -4000, -3000, 8000, 8000)
    context.drawImage(monster, px, py, width, height)
    context.filter = 'grayscale(0)';
    if (cover == 1) {
        //success
        const cover = await Canvas.loadImage(`./assets/cover/1.png`)
        context.drawImage(cover, 0, 0, 700, 700)
    }
    if (cover == 2) {
        //failed
        const cover = await Canvas.loadImage(`./assets/cover/2.png`)
        context.drawImage(cover, 0, 0, 700, 700)
    }


    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: `${monsterId}.png` });
    return attachment
}

async function generateEmbed(monsterId, bg, health, totalHealth, timeLimit, bounty, name) {
    const attachment = await generateImage(monsterId, bg)
    const embed = new EmbedBuilder()
        .setTitle('A Wild Monster has appeared!')
        .setFields([{ name: 'Name', value: `**${name}**`, inline: true },
        { name: 'Reward', value: `**${bounty}** <:coin:1062542965962194994>`, inline: true },
        { name: 'Remaining HP', value: `( **${health}** / **${totalHealth}** )`, inline: true },
        { name: 'Time Left', value: `<t:${Number(moment().unix()) + Math.ceil(Number(timeLimit) / 1000) - 1}:R>`, inline: true }
        ])
        .setImage(`attachment://${monsterId}.png`);

    return { embed, attachment }
}



function shuffle(array) {
    array.sort(() => Math.random() - 0.5);
}

async function generateRows(customId, monsterId, bgId, maxHP, name, answer) {
    //const attckMsg = ["Attack", "attack", "4tt4ck", "att4ck", "4ttack", "4774ck", "47tack"]
    let low = randomIntFromInterval(0, answer - 1);
    let high = randomIntFromInterval(answer + 1, answer + 5);
    let lower = randomIntFromInterval(answer + 6, answer + 10);
    const rands = [{
        customId: `attack:${customId}:${monsterId}:${bgId}:${maxHP}:${name}:${String(answer)}`,
        emoji: "⚔️",
        btnStyle: ButtonStyle.Secondary,
        label: String(answer),
    }, {
        customId: `attack:${customId}:${monsterId}:${bgId}:${maxHP}:${name}:${String(low)}`,
        emoji: "⚔️",
        btnStyle: ButtonStyle.Secondary,
        label: String(low),
    }, {
        customId: `attack:${customId}:${monsterId}:${bgId}:${maxHP}:${name}:${String(high)}`,
        emoji: "⚔️",
        btnStyle: ButtonStyle.Secondary,
        label: String(high),
    }, {
        customId: `attack:${customId}:${monsterId}:${bgId}:${maxHP}:${name}:${String(lower)}`,
        emoji: "⚔️",
        btnStyle: ButtonStyle.Secondary,
        label: String(lower),
    }]
    shuffle(rands)
    const rows = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(rands[0].customId)
                .setEmoji(rands[0].emoji)
                .setLabel(rands[0].label)
                .setStyle(rands[0].btnStyle),
        )
        .addComponents(
            new ButtonBuilder()
                .setCustomId(rands[1].customId)
                .setEmoji(rands[1].emoji)
                .setLabel(rands[1].label)
                .setStyle(rands[1].btnStyle),
        )
        .addComponents(
            new ButtonBuilder()
                .setCustomId(rands[2].customId)
                .setEmoji(rands[2].emoji)
                .setLabel(rands[2].label)
                .setStyle(rands[2].btnStyle),
        )
        .addComponents(
            new ButtonBuilder()
                .setCustomId(rands[3].customId)
                .setEmoji(rands[3].emoji)
                .setLabel(rands[3].label)
                .setStyle(rands[3].btnStyle),
        )
    return rows
}


function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}
const applyText = (canvas, text) => {
    const context = canvas.getContext('2d');

    // Declare a base size of the font
    let fontSize = 70;

    do {
        // Assign the font to the context and decrement it so it can be measured again
        context.font = `${fontSize -= 10}px sans-serif`;
        // Compare pixel width of the text to the canvas minus the approximate avatar size
    } while (context.measureText(text).width > canvas.width - 300);

    // Return the result to use in the actual canvas
    return context.font;
};
async function generateQuizEmbed(uuid) {
    const first = randomIntFromInterval(0, 9)
    const last = randomIntFromInterval(0, 9)
    const attachment = await generateQuiz(uuid, first, last);
    const embed = new EmbedBuilder()
        .setImage(`attachment://${uuid}.png`)
    return { quizEmbed: embed, quizAttachment: attachment, answer: Number(first) + Number(last) }
}

async function generateQuiz(uuid, first, last) {

    const canvas = Canvas.createCanvas(700, 200);

    const context = canvas.getContext('2d');
    context.webkitImageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.imageSmoothingEnabled = false;
    context.font = applyText(canvas, `${first} + ${last} = ?`);
    context.fillStyle = '#ffffff';
    context.fillText(`${first} + ${last} = ?`, canvas.width / 3, canvas.height / 1.8);


    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: `${uuid}.png` });
    return attachment
}



client.login("MTA2MjU2NTM3NDU0NzIwMjA0OA.GaQ27V.HKj9sjvXMywmWKzvcaLWVstGrun6fC5u6zrsdw");