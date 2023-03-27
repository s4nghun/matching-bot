import { EmbedBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } from 'discord.js';

export default async function LeaderBoard(interaction, page, type) {
	let val = "";
	let count = 0;
	let rows = [];
	if (type == 'guild') {
		const result = await guildRankings()
		count = result.rows.length;
		rows = result.rows
		await Promise.all(
			rows
				.sort((a, b) => b.point - a.point)
				.map((v, i) => {
					if (i >= ((page - 1) * 5) && i < (((page - 1) * 5) + 5)) {
						val += `\`${i + 1}\` <@&${v.guildId}>  `
						val += `<:coin:1062187763023237240> \`${v.point.toLocaleString('en')}\`\n`;
					}
				})
		)
	} else {
		const result = await getUsers(page);
		count = result.count;
		rows = result.rows

		await Promise.all(
			rows
				.sort((a, b) => b.point - a.point)
				.map((v, i) => {
					val += `\`${((Number(page) - 1) * 5) + i + 1}\` <@${v.discordId}>  `
					val += `<:index_pointing_at_the_viewer:1062188036156297297> \`${v.count}\` `
					val += `<:coin:1062187763023237240> \`${v.point.toLocaleString('en')}\`\n`;
				})
		)
	}
	const maxPage = Math.ceil(Number(count) / 5)


	const guild = interaction.guild
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`prev:${type}:${page}`)
				.setLabel('Prev')
				.setStyle(ButtonStyle.Primary)
				.setDisabled((page == 1)),
		)
		.addComponents(
			new ButtonBuilder()
				.setCustomId(`next:${type}:${page}`)
				.setLabel('Next')
				.setStyle(ButtonStyle.Primary)
				.setDisabled((page == maxPage)),
		);
	const embed = new EmbedBuilder()
		.setTitle(`<:trophy:1062187046678044844> Leader Board`)
		.addFields({ name: 'Ranking', value: val })
		.setColor('Aqua')
		.setFooter({ text: `Page( ${page}/${maxPage} )` })
		.setTimestamp()
		.setAuthor({
			name: 'Meta Toy City',
			iconURL: guild.iconURL(),
		});

	return { embed, row }
}