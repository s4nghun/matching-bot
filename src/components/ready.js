import { EmbedBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } from 'discord.js';
import emoji from "../data/emoji.json" assert { type: "json" };
import types from "../data/matchTypes.json" assert { type: "json" };

export default async function ReadyEmbed({
    interaction, party, size, type_str, sessionId, expiry
}) {
    if (!expiry) {
        let now = new Date().getTime()
        expiry = Number(Math.floor(now / 1000)) + 60
    }
    let partyMembers = ""
    let content = "";
    console.log(party)
    await Promise.all(
        party.map(async v => {
            console.log(v.playerId)
            let playerId = v.playerId;
            console.log(playerId)
            content += `<@${playerId}> `
            if (v.status == 1) {
                partyMembers += `\n :white_check_mark: [ ${emoji[v.role]} ] <@${String(playerId)}>`
            } else {
                partyMembers += `\n <a:loader:1089743842158329896> [ ${emoji[v.role]} ] <@${String(playerId)}> `
            }
        })
    )
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`ready:${sessionId}:${size}:${type_str}:${expiry}`)
                .setLabel('Ready')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`cancel:${sessionId}:${size}:${type_str}:${expiry}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger),
        );

    const embed = new EmbedBuilder()
        .setTitle(`<:crossed_swords:1089748938334146560> Match Making <t:${expiry}:R>`)
        .addFields({ name: `<:family:1089750064735453205> ${size}v${size} ${types[type_str]} 매칭 성공!`, value: partyMembers })
        .setColor('Blue')
        .setTimestamp();




    return { embed, row, content }
}