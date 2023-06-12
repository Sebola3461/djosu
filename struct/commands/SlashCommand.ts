import {
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	PermissionResolvable,
	PermissionsBitField,
	SlashCommandAttachmentOption,
	SlashCommandBooleanOption,
	SlashCommandBuilder,
	SlashCommandChannelOption,
	SlashCommandIntegerOption,
	SlashCommandMentionableOption,
	SlashCommandNumberOption,
	SlashCommandRoleOption,
	SlashCommandStringOption,
	SlashCommandUserOption,
} from "discord.js";
import { SlashCommandSubcommand } from "./SlashCommandSubcommand";
import { SlashCommandSubcommandGroup } from "./SlashCommandSubcommandGroup";

export type SlashCommandMainFunction = (
	command: ChatInputCommandInteraction
) => void;

export class SlashCommand {
	private _ = new SlashCommandBuilder();
	private _permissions = new PermissionsBitField();
	private _ephemeral = false;
	private _hasModal = false;
	private _subcommands: SlashCommandSubcommand[] = [];
	private _subcommand_groups: SlashCommandSubcommandGroup[] = [];
	private _main: SlashCommandMainFunction = (
		command: ChatInputCommandInteraction
	) => void {};

	constructor() {}

	public setName(name: string) {
		this._.setName(name);
		return this;
	}

	public setDescription(description: string) {
		this._.setDescription(description);
		return this;
	}

	public setDMPermission(allow: boolean) {
		this._.setDMPermission(allow);
		return this;
	}

	public setPermissions(...permissions: PermissionResolvable[]) {
		this._permissions.add(permissions);
		this._.setDefaultMemberPermissions(this.permissions.bitfield);
		return this;
	}

	public setEphemeral(isEphemeral: boolean) {
		this._ephemeral = isEphemeral;
		return this;
	}

	public setModal(hasModal: boolean) {
		this._hasModal = hasModal;
		return this;
	}

	public addOptions(
		...options: (
			| SlashCommandAttachmentOption
			| SlashCommandStringOption
			| SlashCommandRoleOption
			| SlashCommandUserOption
			| SlashCommandUserOption
			| SlashCommandNumberOption
			| SlashCommandBooleanOption
			| SlashCommandChannelOption
			| SlashCommandIntegerOption
			| SlashCommandMentionableOption
		)[]
	) {
		for (const option of options) {
			if (option.type == ApplicationCommandOptionType.Attachment)
				this._.addAttachmentOption(option);
			if (option.type == ApplicationCommandOptionType.Boolean)
				this._.addBooleanOption(option);
			if (option.type == ApplicationCommandOptionType.Channel)
				this._.addChannelOption(option);
			if (option.type == ApplicationCommandOptionType.Integer)
				this._.addIntegerOption(option);
			if (option.type == ApplicationCommandOptionType.Mentionable)
				this._.addMentionableOption(option);
			if (option.type == ApplicationCommandOptionType.Number)
				this._.addNumberOption(option);
			if (option.type == ApplicationCommandOptionType.Role)
				this._.addRoleOption(option);
			if (option.type == ApplicationCommandOptionType.String)
				this._.addStringOption(option);
			if (option.type == ApplicationCommandOptionType.User)
				this._.addUserOption(option);
		}

		return this;
	}

	public setExecutable(f: SlashCommandMainFunction) {
		this._main = f;

		return this;
	}

	public execute(command: ChatInputCommandInteraction) {
		this._main(command);

		return this;
	}

	public getGroup(groupName: string) {
		return this._subcommand_groups.find(
			(g) => g.name.trim().toLowerCase() == groupName.toLowerCase().trim()
		);
	}

	public getSubcommand(commandName: string) {
		return this._subcommands.find(
			(g) =>
				g.name.trim().toLowerCase() == commandName.toLowerCase().trim()
		);
	}

	public addSubcommand(command: SlashCommandSubcommand) {
		this._subcommands.push(command);
		this._.addSubcommand(command.onlyBuilder());

		return this;
	}

	public addSubcommandGroup(group: SlashCommandSubcommandGroup) {
		this._subcommand_groups.push(group);
		this._.addSubcommandGroup(group.onlyBuilder());

		return this;
	}

	public get permissions() {
		return this._permissions;
	}

	public get isEphemeral() {
		return this._ephemeral;
	}

	public get hasModal() {
		return this._hasModal;
	}

	public get name() {
		return this._.name;
	}

	public get description() {
		return this._.description;
	}

	public get dm_permission() {
		return this._.dm_permission;
	}

	public toJSON() {
		return this._.toJSON();
	}
}
