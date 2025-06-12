import { getBearerToken, validateJWT } from "../auth";
import { respondWithJSON } from "./json";
import { getVideo, updateVideo } from "../db/videos";
import type { ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { BadRequestError, NotFoundError, UserForbiddenError } from "./errors";
import path from 'path'
import { randomBytes } from "crypto";

const MAX_UPLOAD_SIZE = 10 << 20

export async function handlerUploadThumbnail(cfg: ApiConfig, req: BunRequest) {
	const { videoId } = req.params as { videoId?: string };
	if (!videoId) {
		throw new BadRequestError("Invalid video ID");
	}
	const token = getBearerToken(req.headers);
	const userID = validateJWT(token, cfg.jwtSecret);
	console.log("uploading thumbnail for video", videoId, "by user", userID);
	const formData = await req.formData()
	const file = formData.get("thumbnail")
	if (!(file instanceof File)) {
		throw new BadRequestError("Thumbnail file missing")
	}
	if (file.size > MAX_UPLOAD_SIZE) {
		throw new BadRequestError("File to big")
	}
	const mediaType = file.type
	const fileExt = mediaType.split("/")[1]
	const base = randomBytes(32).toString("base64url")
	const fileName = `${base}.${fileExt}`
	const video = getVideo(cfg.db, videoId)
	if (video?.userID !== userID) {
		throw new UserForbiddenError("User not allowed to access video")
	}
	await Bun.write(path.join(cfg.assetsRoot, fileName), file)
	video.thumbnailURL = `http://localhost:${cfg.port}/assets/${fileName}`
	updateVideo(cfg.db, video)

	return respondWithJSON(200, video);
}
