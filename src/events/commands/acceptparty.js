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
	const guild = interaction.guild;

	let invitations = await getInvitationList({playerId: interaction.member.id})
	let organizedInvitations = [];
	await Promise.all(
		invitations.data.map(async v=>{
			let member = await interaction.guild.members.fetch(v)
			console.log(member.user.username)
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
	
	return await interaction.reply({ content: `You are not a guild master!`,components:[row], ephemeral: true });
};

export { create, invoke };