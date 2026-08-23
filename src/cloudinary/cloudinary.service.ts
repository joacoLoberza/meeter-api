import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Sube un Buffer (de Multer) a Cloudinary usando Streams.
   * @param fileBuffer Buffer de la imagen cargada en memoria.
   * @param folder Carpeta de destino en Cloudinary (ej: 'services', 'users').
   */
  async uploadImage(fileBuffer: Buffer, folder: string = 'general'): Promise<UploadApiResponse> {
		return new Promise((resolve, reject) => {
			const uploadStream = cloudinary.uploader.upload_stream(
				{ folder },
				(error, result) => {
					if (error) return reject(error);
					if (!result) return reject(new Error('Cloudinary response is undefined'));
					resolve(result);
				},
			);

			const stream = new Readable();
			stream.push(fileBuffer);
			stream.push(null);
			stream.pipe(uploadStream);
		});
	}
}