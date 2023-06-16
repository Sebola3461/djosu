import "colors";

export class LoggerService {
	private module: string;

	constructor(module: string) {
		this.module = module;
	}

	public printSuccess(message: string) {
		console.log(
			new Date().toLocaleTimeString() +
				" " +
				`[${this.module}]`.bgYellow.black +
				`${message}`.bgGreen.black
		);
	}

	public printError(message: string, error?: any) {
		console.log(
			new Date().toLocaleTimeString() +
				" " +
				`[${this.module}]`.bgYellow.black +
				`${message}`.bgRed.black
		);
		error ? console.error(error) : void {};
	}

	public printInfo(message: string) {
		console.log(
			new Date().toLocaleTimeString() +
				" " +
				`[${this.module}]`.bgCyan.black +
				`${message}`.bgBlue.black
		);
	}

	public printWarning(message: string) {
		console.log(
			new Date().toLocaleTimeString() +
				`[${this.module}]`.bgYellow.black +
				`${message}`.bgYellow.black
		);
	}
}
