import { SlashCommandBuilder } from 'discord.js';
import { invitePlayer, leaveParty } from '../../services/party.cjs';

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('leaveparty')
		.setDescription(
			'Leave your current party'
		)
		.setDMPermission(false)

	return command.toJSON();
};

const invoke = async (interaction) => {
	const guild = interaction.guild;
	let { status, msg } = await leaveParty({ playerId: interaction.member.id })
	if (!status) {
		return await interaction.reply({ content: msg, ephemeral: true });
	}
	return await interaction.reply({ content: `You have left party`, ephemeral: true });
};

export { create, invoke };