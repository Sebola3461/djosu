// Generated by https://quicktype.io

export interface FFProbeOutput {
	streams: Stream[];
	format: Format;
}

export interface Format {
	filename: string;
	nb_streams: number;
	format_name: string;
	format_long_name: string;
	start_time: string;
	duration: string;
	size: string;
	bit_rate: string;
	tags: FormatTags;
}

export interface FormatTags {
	major_brand: string;
	minor_version: string;
	compatible_brands: string;
	creation_time: string;
}

export interface Stream {
	index: number;
	codec_name: string;
	codec_long_name: string;
	codec_type: string;
	codec_time_base: string;
	codec_tag_string: string;
	codec_tag: string;
	width?: number;
	height?: number;
	has_b_frames?: number;
	pix_fmt?: string;
	level?: number;
	is_avc?: string;
	nal_length_size?: string;
	r_frame_rate: string;
	avg_frame_rate: string;
	time_base: string;
	start_time: string;
	duration: string;
	bit_rate: string;
	nb_frames: string;
	tags: StreamTags;
	sample_fmt?: string;
	sample_rate?: string;
	channels?: number;
	bits_per_sample?: number;
}

export interface StreamTags {
	creation_time: string;
	language: string;
	handler_name: string;
}