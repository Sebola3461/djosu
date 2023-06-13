import { PermissionFlagsBits, VoiceBasedChannel } from "discord.js";

export function clientHasValidVoicePermissions(channel: VoiceBasedChannel) {
	if (!channel.guild.members.me) return false;

	const clientPermissions = channel.guild.members.me.permissionsIn(channel);

	if (
		!clientPermissions.has(PermissionFlagsBits.Connect, true) ||
		!clientPermissions.has(PermissionFlagsBits.Speak, true)
	)
		return false;

	return true;
}
