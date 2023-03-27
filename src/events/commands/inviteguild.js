import { SlashCommandBuilder } from 'discord.js';


const create = () => {
	const command = new SlashCommandBuilder()
		.setName('inviteguild')
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

	let master = interaction.options.getUser('user')
	let user = await guild.members.cache.get(master.id)
	let memberRole = await guild.roles.cache.find(r => r.name === 'mtc-guild-member');
	let masterRole = await guild.roles.cache.find(r => r.name === 'mtc-guild-master');
	if (user._roles.includes(memberRole.id) || user._roles.includes(masterRole.id)) {
		return await interaction.reply({ content: `User already joined the guild!`, ephemeral: true });
	}

	if (interaction.member.roles.cache.some(role => role.name === 'mtc-guild-master')) {
		try {
			await inviteUser({ userId: master.id, userName: master.username, masterId: interaction.member.id })
			return await interaction.reply({ content: `Successfully invited <@${master.id}> !`, ephemeral: true });
		} catch (e) {
			console.log(e)
			return await interaction.reply({ content: 'Cannot invite tagged user!', ephemeral: true })
		}
	}
	return await interaction.reply({ content: `You are not a guild master!`, ephemeral: true });
};

export { create, invoke };