import {
	createWriteStream,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
} from "fs";
import { Beatmap } from "osu-classes";
import { BeatmapDecoder } from "osu-parsers";
import path from "path";
import { EventEmitter } from "ws";
import yauzl from "yauzl";

export class BeatmapsetImporter extends EventEmitter {
	private OSZ;
	private StageFolder = path.resolve("./cache/staging/");
	private ImportFolder = path.resolve("./cache/beatmapsets/");
	private BeatmapsetId: string;
	public Beatmaps: Beatmap[] = [];

	constructor(osz: Buffer, beatmapsetId: string) {
		super();

		this.OSZ = osz;

		this.BeatmapsetId = beatmapsetId;

		this.validateTempFolders();
	}

	private getBeatmapsetId() {
		return this.BeatmapsetId;
	}

	private getImportFolder() {
		return this.ImportFolder;
	}

	private getStageFolder() {
		return this.StageFolder;
	}

	public loadDifficulties() {
		const beatmapFiles = readdirSync(
			path.join(this.getImportFolder(), this.getBeatmapsetId())
		).filter((file) => file.endsWith(".osu"));

		const decoder = new BeatmapDecoder();

		for (const beatmapFile of beatmapFiles) {
			const fileContent = readFileSync(
				path.join(
					this.getImportFolder(),
					this.getBeatmapsetId(),
					beatmapFile
				),
				"utf8"
			);

			const mapData = decoder.decodeFromString(fileContent, {
				parseStoryboard: false,
			});

			this.Beatmaps.push(mapData);
		}

		return this.Beatmaps;
	}

	public getBeatmaps() {
		return this.Beatmaps;
	}

	public getAudioFileFromDifficulty(beatmapId: number) {
		try {
			const mapData = this.Beatmaps.find(
				(b) => b.metadata.beatmapId == beatmapId
			);

			if (!mapData) return null;

			return readFileSync(
				path.join(
					this.getImportFolder(),
					this.getBeatmapsetId(),
					mapData.general.audioFilename
				)
			);
		} catch (e) {
			console.error(e);

			return null;
		}
	}

	public getAudioFileFromIndex(index: number) {
		try {
			const mapData = this.Beatmaps[index];

			if (!mapData) return null;

			return {
				buffer: readFileSync(
					path.join(
						this.getImportFolder(),
						this.getBeatmapsetId(),
						mapData.general.audioFilename
					)
				),
				path: path.join(
					this.getImportFolder(),
					this.getBeatmapsetId(),
					mapData.general.audioFilename
				),
			};
		} catch (e) {
			console.error(e);

			return null;
		}
	}

	importOSZ() {
		this.createFolders.bind(this);
		this.getBeatmapsetId.bind(this);
		this.getImportFolder.bind(this);
		this.getStageFolder.bind(this);
		this.deleteOSZFile.bind(this);
		this.deleteBeatmapFolder.bind(this);
		this.loadDifficulties.bind(this);

		return new Promise((resolve, reject) => {
			try {
				yauzl.open(
					path
						.join(this.getStageFolder(), this.getBeatmapsetId())
						.concat(".zip"),
					{ lazyEntries: true },
					(err, zipfile) => {
						if (err) throw err;

						zipfile.readEntry();

						zipfile.on("entry", (entry) => {
							/// * Check if the entry is a folder
							if (entry.fileName.split("/").length != 1) {
								this.createFolders(
									entry.fileName
										.split("/")
										.filter((p: string) => p.trim() != "")
										.map((p: string) => p.trim())
								);
							}

							if (/\/$/.test(entry.fileName)) {
								zipfile.readEntry();
							} else {
								const destinationStream = createWriteStream(
									path.join(
										this.getImportFolder(),
										this.getBeatmapsetId(),
										entry.fileName
									)
								);

								zipfile.openReadStream(
									entry,
									(err, readStream) => {
										if (err) throw err;
										readStream.on("end", function () {
											zipfile.readEntry();
										});
										readStream.pipe(destinationStream);
									}
								);
							}
						});

						zipfile.on("end", () => {
							zipfile.close();
							resolve(true);
						});
					}
				);
			} catch (e) {
				reject(e);
			}
		});
	}

	public deleteOSZFile() {
		return rmSync(
			path.join(this.getStageFolder(), `${this.getBeatmapsetId()}.zip`),
			{
				force: true,
			}
		);
	}

	private createFolders(paths: string[]) {
		paths.pop(); /// * remove filename from path

		const target = [] as string[];

		for (const _path of paths) {
			target.push(_path);

			if (
				!existsSync(
					path.join(
						this.ImportFolder,
						this.BeatmapsetId,
						target.join("/")
					)
				)
			)
				mkdirSync(
					path.join(
						this.ImportFolder,
						this.BeatmapsetId,
						target.join("/")
					)
				);
		}
	}

	public deleteBeatmapFolder() {
		return rmSync(`${this.getImportFolder()}/${this.BeatmapsetId}`, {
			recursive: true,
			force: true,
		});
	}

	private validateTempFolders() {
		if (!existsSync(path.resolve(this.ImportFolder)))
			mkdirSync(this.ImportFolder);

		if (
			existsSync(path.resolve(`./cache/beatmapsets/${this.BeatmapsetId}`))
		)
			this.deleteBeatmapFolder();

		mkdirSync(path.join(this.ImportFolder, this.BeatmapsetId));
	}
}
