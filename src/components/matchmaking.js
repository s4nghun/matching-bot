import { EmbedBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } from 'discord.js';
import emoji from "../data/emoji.json" assert { type: "json" };
import types from "../data/matchTypes.json" assert { type: "json" };

export default async function MatchMaker(interaction, joined, size, type_str) {
	let val = ""
	let partyMembers = ""
	let count = joined.length
	for (let i = 0; i < count; i++) {
		val += `<:bust_in_silhouette:1089799031594692720> `
	}
	for (let j = 0; j < size - count; j++) {
		val += `<a:loader:1089743842158329896> `
	}
	await Promise.all(
		joined.map(async v => {
			partyMembers += `\n <@${v.id}> : `
			await v.roles.map(j => {
				partyMembers += `${emoji[j]} `
			})
		})
	)

	const guild = interaction.guild
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`quit:${interaction.member.id}`)
				.setLabel('Quit')
				.setStyle(ButtonStyle.Danger),
		);
	let now = new Date().getTime()
	const embed = new EmbedBuilder()
		.setTitle(`<:crossed_swords:1089748938334146560> Match Making <t:${Number(Math.floor(now / 1000)) + 60}:R>`)
		.addFields({ name: `<:family:1089750064735453205> ${types[type_str]} 매칭 중`, value: val })
		.addFields({ name: ` ${emoji["Party"]} 파티원`, value: partyMembers })
		.setColor('Aqua')
		.setTimestamp();

	return { embed, row }
}