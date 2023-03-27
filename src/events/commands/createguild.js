import { SlashCommandBuilder, ChannelType, PermissionsBitField } from 'discord.js';

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('createguild')
		.setDescription(
			'createGuild'
		)
		.addStringOption(option =>
			option.setName('name')
				.setDescription('The name of guild')
				.setRequired(true))
		.addUserOption(option =>
			option.setName('master')
				.setDescription('Tag the master of guild')
				.setRequired(true))
		.setDMPermission(false)

	return command.toJSON();
};

const invoke = async (interaction) => {

	const guild = interaction.guild;
	let master = interaction.options.getUser('master')
	let guildName = await interaction.options.getString('name')


	let checkUser = await check({ discordId: master.id })
	if (checkUser) {
		return await interaction.reply({ content: 'User is in the guild', ephemeral: true });
	}
	let categoryId = await getGuildCategory()

	let masterRoleId = await getMasterRole()
	let masterRole = await interaction.guild.roles.cache.find(r => r.id === masterRoleId);
	let everyoneRole = guild.roles.cache.find(r => r.name === '@everyone');
	let member = guild.members.cache.get(master.id);

	let guildRole = await interaction.guild.roles.create({
		name: `${guildName}`,
		data: {
			name: `${guildName}`,
			color: "BLUE"
		},
		reason: `${guildName} guild has created`
	});
	await member.roles.add(guildRole)
	await member.roles.add(masterRole)

	await interaction.guild.channels.create({
		name: guildName,
		type: ChannelType.GuildText,
		parent: categoryId,
		permissionOverwrites: [
			{
				id: everyoneRole.id,
				deny: [PermissionsBitField.Flags.ViewChannel],
			},
			{
				id: guildRole.id,
				allow: [PermissionsBitField.Flags.ViewChannel]
			}
		],
	});

	await createGuild({ guildName, discordId: master.id, discordName: member.user.username, roleId: guildRole.id })
	interaction.reply({ content: 'Created Guild', ephemeral: true });
};

export { create, invoke };