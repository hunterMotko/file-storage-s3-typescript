import { BadRequestError } from './api/errors';
import type { ApiConfig } from './config'
import type { Video } from './db/videos';

export async function uploadVideoToS3(
	cfg: ApiConfig,
	key: string,
	processesFilePath: string,
	contentType: string,
) {
	const s3file = cfg.s3Client.file(key, { bucket: cfg.s3Bucket });
	const videoFile = Bun.file(processesFilePath);
	await s3file.write(videoFile, { type: contentType });
}

export async function generatePresignedURL(
	cfg: ApiConfig,
	key: string,
	expireTime: number,
) {
	return cfg.s3Client.presign(`${key}`, { expiresIn: expireTime });
}

export async function dbVideoToSignedVideo(cfg: ApiConfig, video: Video) {
	if (!video.videoURL) {
		return video
	}

	video.videoURL = await generatePresignedURL(cfg, video?.videoURL || '', 5 * 60)
	return video
}
