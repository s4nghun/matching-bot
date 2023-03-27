import { EmbedBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } from 'discord.js';


export default async function MatchMaker(interaction, joined) {
	//const maxPage = Math.ceil(Number(count) / 5)
	let val = ""
	let count = joined.length
	for (let i = 0; i < count; i++) {
		val += `<:bust_in_silhouette:1089799031594692720> `
	}
	for (let j = 0; j < 5 - count; j++) {
		val += `<a:loader:1089743842158329896> `
	}

	const guild = interaction.guild
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`quit:${interaction.member.id}`)
				.setLabel('Quit')
				.setStyle(ButtonStyle.Danger),
		)
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`next`)
				.setLabel('Ready')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(true),
		);
	console.log('<a:albionoffline:598828015132213259>')
	const embed = new EmbedBuilder()
		.setTitle(`<:crossed_swords:1089748938334146560> Match Making <t:12345:d>`)
		.addFields({ name: '<:family:1089750064735453205> 매칭 중', value: val })
		.setColor('Aqua')
		.setTimestamp();

	return { embed, row }
}