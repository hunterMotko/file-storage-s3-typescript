import { respondWithJSON } from "./json";
import { type ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { getBearerToken, validateJWT } from "../auth";
import { getVideo, updateVideo } from "../db/videos";
import { BadRequestError, UserForbiddenError } from "./errors";
import os from 'node:os'
import path from "node:path";
import { randomBytes } from "node:crypto";

const UPLOAD_LIMIT = 1 << 30;

export async function handlerUploadVideo(cfg: ApiConfig, req: BunRequest) {
	const { videoId } = req.params as { videoId?: string }
	const token = getBearerToken(req.headers)
	const userId = validateJWT(token, cfg.jwtSecret)
	const video = getVideo(cfg.db, videoId as string)
	if (video?.userID !== userId) {
		throw new UserForbiddenError('User Forbidden')
	}
	const formData = await req.formData()
	const file = formData.get('video')
	if (!(file instanceof File)) {
		throw new BadRequestError("video file missing")
	}
	if (file.size > UPLOAD_LIMIT) {
		throw new BadRequestError("File to big")
	}
	const fileExt = file.type.split("/")[1]
	if (!fileExt.includes('mp4')) {
		throw new BadRequestError("File is not an mp4")
	}


	const fileName = `${randomBytes(32).toString("base64url")}.${fileExt}`
	const tmp = os.tmpdir()
	const filePath = path.join(tmp, fileName)
	await Bun.write(filePath, file)
	const bunFile = Bun.file(filePath)
	await cfg.s3Client.write(fileName, bunFile)
	video.videoURL = `https://${cfg.s3Bucket}.s3.${cfg.s3Region}.amazonaws.com/${fileName}`

	updateVideo(cfg.db, video)

	return respondWithJSON(200, null);
}
