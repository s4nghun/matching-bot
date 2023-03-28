import { SlashCommandBuilder } from 'discord.js';
import { invitePlayer } from '../../services/party.cjs';

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('inviteparty')
		.setDescription(
			'Send an invitation request to a tagged user *Only guild master is allowed to use this command'
		)
		.addUserOption(option =>
			option.setName('user')
				.setDescription('Tag a user')
				.setRequired(true))
		.setDMPermission(false)

	return command.toJSON();
};

const invoke = async (interaction) => {
	const guild = interaction.guild;
	let inviteeId = await interaction.options.getUser('user').id
	let result = await invitePlayer({ inviteeId, inviterId: interaction.member.id })
	if (result.status) {
		return await interaction.reply({ content: `You have invited <@${inviteeId}> to your party`, ephemeral: true });
	} else {
		return await interaction.reply({ content: `${result.msg}`, ephemeral: true });
	}
};

export { create, invoke };