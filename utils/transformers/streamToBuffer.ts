import internal from "stream";

export function streamToBuffer(stream: internal.Writable): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const data: Uint8Array[] = [];

		stream.on("data", function (d) {
			data.push(d);
		});

		stream.on("end", function () {
			resolve(Buffer.concat(data));
		});

		stream.on("error", function (e) {
			reject(e);
		});
	});
}
