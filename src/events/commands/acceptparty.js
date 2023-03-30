import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { invitePlayer, getInvitationList } from '../../services/party.cjs';

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('acceptparty')
		.setDescription(
			'Accepting party invitation'
		)
		.setDMPermission(false)

	return command.toJSON();
};

const invoke = async (interaction) => {
	let invitations = await getInvitationList({ playerId: interaction.member.id })
	console.log(invitations.data.length)
	if (invitations.data.length < 1) {
		return await interaction.reply({ content: `You didn't receive any invitation list`, ephemeral: true });
	}
	let organizedInvitations = [];
	await Promise.all(
		invitations.data.map(async v => {
			console.log(v)
			let member = await interaction.guild.members.fetch(v)
			organizedInvitations = [
				...organizedInvitations,
				{
					label: `${member.user.username}'s invitation request`,
					description: `${member.user.username}의 파티 초대`,
					value: v
				}
			]
		})
	)
	const row = new ActionRowBuilder()
		.addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('selectparty')
				.setPlaceholder('Nothing selected')
				.addOptions(
					...organizedInvitations
				),
		);

	return await interaction.reply({ content: `Please select party from the dropdown menu!`, components: [row], ephemeral: true });
};

export { create, invoke };