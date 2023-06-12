import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { SlashCommandSubcommand } from "./SlashCommandSubcommand";

export class SlashCommandSubcommandGroup {
	private _ = new SlashCommandSubcommandGroupBuilder();
	private _commands: SlashCommandSubcommand[] = [];

	constructor() {}

	public setName(name: string) {
		this._.setName(name);
		return this;
	}

	public setDescription(description: string) {
		this._.setDescription(description);
		return this;
	}

	public addCommands(...commands: SlashCommandSubcommand[]) {
		this._commands = this._commands.concat(commands);

		return;
	}

	public getCommand(commandName: string) {
		return this._commands.find(
			(c) =>
				c.name.toLowerCase().trim() == commandName.toLowerCase().trim()
		);
	}

	public get name() {
		return this._.name;
	}

	public get description() {
		return this._.description;
	}

	/**
	 * # Internal usage
	 */
	public onlyBuilder() {
		return this._;
	}

	public toJSON() {
		return this._.toJSON();
	}
}
