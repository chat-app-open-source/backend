/* eslint-disable @typescript-eslint/no-explicit-any */
import AWS from 'aws-sdk';
import admin from 'firebase-admin';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { envConfig } from '../config/env';
import { getFirebaseStorage } from '../config/firebase';
import logger from '../config/logger';
import { File } from '../models';
import type { FileUploadResult, StorageService } from '../types/file.types';
export class FirebaseStorageService implements StorageService {
  private storage: admin.storage.Storage;

  constructor() {
    const firebaseStorage = getFirebaseStorage();
    if (!firebaseStorage) {
      throw new Error('Firebase storage not initialized');
    }
    this.storage = firebaseStorage;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
    _options?: any,
  ): Promise<FileUploadResult> {
    try {
      const fileName = `${folder}/${uuidv4()}-${file.originalname}`;
      const bucket = this.storage.bucket();

      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
        public: true,
      });

      // Make the file publicly accessible
      await fileUpload.makePublic();

      const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      let thumbnailUrl: string | undefined;
      let duration: number | undefined;

      // Generate thumbnail for images and videos
      if (file.mimetype.startsWith('image/')) {
        thumbnailUrl = await this.generateImageThumbnail(file, folder);
      } else if (file.mimetype.startsWith('video/')) {
        const result = await this.generateVideoThumbnail(file, folder);
        thumbnailUrl = result.thumbnailUrl;
        duration = result.duration;
      }

      return {
        url,
        thumbnailUrl,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: this.getFileType(file.mimetype),
        duration,
        storage: 'firebase',
      };
    } catch (error) {
      logger.error('Firebase file upload failed', {
        error: (error as Error).message,
        fileName: file.originalname,
      });
      throw error;
    }
  }

  async deleteFile(url: string): Promise<void> {
    try {
      const bucket = this.storage.bucket();
      const fileName = url.split('/').pop();

      if (fileName) {
        await bucket.file(fileName).delete();
        logger.info('File deleted from Firebase', { fileName });
      }
    } catch (error) {
      logger.error('Failed to delete file from Firebase', {
        error: (error as Error).message,
        url,
      });
      throw error;
    }
  }

  async generateImageThumbnail(file: Express.Multer.File, folder: string): Promise<string> {
    try {
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailName = `${folder}/thumbnails/${uuidv4()}-thumb-${file.originalname}.jpg`;
      const bucket = this.storage.bucket();

      const thumbnailUpload = bucket.file(thumbnailName);
      await thumbnailUpload.save(thumbnailBuffer, {
        metadata: {
          contentType: 'image/jpeg',
        },
        public: true,
      });

      await thumbnailUpload.makePublic();
      return `https://storage.googleapis.com/${bucket.name}/${thumbnailName}`;
    } catch (error) {
      logger.error('Image thumbnail generation failed', {
        error: (error as Error).message,
      });
      return '';
    }
  }

  async generateVideoThumbnail(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ thumbnailUrl: string; duration?: number }> {
    try {
      // For video thumbnails, we'd typically use ffmpeg
      // This is a simplified version - in production, you'd extract the first frame
      const thumbnailName = `${folder}/thumbnails/${uuidv4()}-thumb-${file.originalname}.jpg`;
      const bucket = this.storage.bucket();

      // Create a placeholder thumbnail (in production, use ffmpeg)
      const placeholderThumbnail = await sharp({
        create: {
          width: 300,
          height: 200,
          channels: 3,
          background: { r: 100, g: 100, b: 100 },
        },
      })
        .jpeg()
        .toBuffer();

      const thumbnailUpload = bucket.file(thumbnailName);
      await thumbnailUpload.save(placeholderThumbnail, {
        metadata: {
          contentType: 'image/jpeg',
        },
        public: true,
      });

      await thumbnailUpload.makePublic();

      return {
        thumbnailUrl: `https://storage.googleapis.com/${bucket.name}/${thumbnailName}`,
        duration: 0, // You would extract this from the video file in production
      };
    } catch (error) {
      logger.error('Video thumbnail generation failed', {
        error: (error as Error).message,
      });
      return { thumbnailUrl: '' };
    }
  }

  async compressImage(file: Express.Multer.File): Promise<Buffer> {
    try {
      if (file.mimetype.startsWith('image/')) {
        return await sharp(file.buffer).jpeg({ quality: 80, progressive: true }).toBuffer();
      }
      return file.buffer;
    } catch (error) {
      logger.error('Image compression failed', {
        error: (error as Error).message,
      });
      return file.buffer;
    }
  }

  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'document';
    return 'file';
  }
}

export class S3StorageService implements StorageService {
  private s3: AWS.S3;

  constructor() {
    if (!envConfig.awsAccessKeyId || !envConfig.awsSecretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    this.s3 = new AWS.S3({
      accessKeyId: envConfig.awsAccessKeyId,
      secretAccessKey: envConfig.awsSecretAccessKey,
      region: envConfig.awsRegion,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
    _options?: any,
  ): Promise<FileUploadResult> {
    try {
      const fileName = `${folder}/${uuidv4()}-${file.originalname}`;

      const params: AWS.S3.PutObjectRequest = {
        Bucket: envConfig.awsS3Bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      };

      const result = await this.s3.upload(params).promise();

      let thumbnailUrl: string | undefined;
      let duration: number | undefined;

      // Generate thumbnail for images and videos
      if (file.mimetype.startsWith('image/')) {
        thumbnailUrl = await this.generateImageThumbnail(file, folder);
      } else if (file.mimetype.startsWith('video/')) {
        const thumbResult = await this.generateVideoThumbnail(file, folder);
        thumbnailUrl = thumbResult.thumbnailUrl;
        duration = thumbResult.duration;
      }

      return {
        url: result.Location,
        thumbnailUrl,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: this.getFileType(file.mimetype),
        duration,
        storage: 's3',
      };
    } catch (error) {
      logger.error('S3 file upload failed', {
        error: (error as Error).message,
        fileName: file.originalname,
      });
      throw error;
    }
  }

  async deleteFile(url: string): Promise<void> {
    try {
      const key = new URL(url).pathname.slice(1); // Remove leading slash

      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: envConfig.awsS3Bucket,
        Key: key,
      };

      await this.s3.deleteObject(params).promise();
      logger.info('File deleted from S3', { key });
    } catch (error) {
      logger.error('Failed to delete file from S3', {
        error: (error as Error).message,
        url,
      });
      throw error;
    }
  }

  async generateImageThumbnail(file: Express.Multer.File, folder: string): Promise<string> {
    try {
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailName = `${folder}/thumbnails/${uuidv4()}-thumb-${file.originalname}.jpg`;

      const params: AWS.S3.PutObjectRequest = {
        Bucket: envConfig.awsS3Bucket,
        Key: thumbnailName,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      };

      const result = await this.s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      logger.error('Image thumbnail generation failed', {
        error: (error as Error).message,
      });
      return '';
    }
  }

  async generateVideoThumbnail(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ thumbnailUrl: string; duration?: number }> {
    try {
      // Simplified video thumbnail generation
      const thumbnailName = `${folder}/thumbnails/${uuidv4()}-thumb-${file.originalname}.jpg`;

      // Create placeholder thumbnail
      const placeholderThumbnail = await sharp({
        create: {
          width: 300,
          height: 200,
          channels: 3,
          background: { r: 100, g: 100, b: 100 },
        },
      })
        .jpeg()
        .toBuffer();

      const params: AWS.S3.PutObjectRequest = {
        Bucket: envConfig.awsS3Bucket,
        Key: thumbnailName,
        Body: placeholderThumbnail,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      };

      const result = await this.s3.upload(params).promise();

      return {
        thumbnailUrl: result.Location,
        duration: 0,
      };
    } catch (error) {
      logger.error('Video thumbnail generation failed', {
        error: (error as Error).message,
      });
      return { thumbnailUrl: '' };
    }
  }

  async compressImage(file: Express.Multer.File): Promise<Buffer> {
    try {
      if (file.mimetype.startsWith('image/')) {
        return await sharp(file.buffer).jpeg({ quality: 80, progressive: true }).toBuffer();
      }
      return file.buffer;
    } catch (error) {
      logger.error('Image compression failed', {
        error: (error as Error).message,
      });
      return file.buffer;
    }
  }

  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'document';
    return 'file';
  }
}

export class FileService {
  private storageService: StorageService;

  constructor() {
    // Choose storage service based on configuration
    if (envConfig.defaultStorage === 's3' && envConfig.awsAccessKeyId) {
      this.storageService = new S3StorageService();
    } else {
      this.storageService = new FirebaseStorageService();
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    uploadedBy: string,
    conversationId?: string,
    folder: string = 'chat',
  ): Promise<FileUploadResult> {
    try {
      // Validate file size
      if (file.size > envConfig.maxFileSize) {
        throw new Error(`File size exceeds maximum limit of ${envConfig.maxFileSize} bytes`);
      }

      // Validate file type
      if (!envConfig.allowedFileTypes.includes(file.mimetype)) {
        throw new Error(`File type ${file.mimetype} is not allowed`);
      }

      // Compress image if it's an image
      let processedBuffer = file.buffer;
      let isCompressed = false;
      let compressionRatio: number | undefined;

      if (file.mimetype.startsWith('image/')) {
        const compressedBuffer = await this.storageService.compressImage!(file);
        if (compressedBuffer.length < file.buffer.length) {
          processedBuffer = compressedBuffer;
          isCompressed = true;
          compressionRatio = file.buffer.length / compressedBuffer.length;
        }
      }

      const processedFile = {
        ...file,
        buffer: processedBuffer,
      };

      // Upload file to storage
      const uploadResult = await this.storageService.uploadFile(processedFile, folder);

      // Save file metadata to database
      const fileDoc = new File({
        originalName: file.originalname,
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        fileSize: uploadResult.fileSize,
        fileType: uploadResult.fileType,
        mimeType: file.mimetype,
        duration: uploadResult.duration,
        uploadedBy: new mongoose.Types.ObjectId(uploadedBy),
        conversationId: conversationId ? new mongoose.Types.ObjectId(conversationId) : undefined,
        storage: uploadResult.storage,
        isCompressed,
        compressionRatio,
      });

      await fileDoc.save();

      logger.info('File uploaded successfully', {
        fileId: fileDoc._id,
        fileName: file.originalname,
        fileSize: file.size,
        storage: uploadResult.storage,
        compressed: isCompressed,
        compressionRatio,
      });

      return uploadResult;
    } catch (error) {
      logger.error('File upload failed', {
        fileName: file.originalname,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    try {
      const fileDoc = await File.findById(fileId);
      if (!fileDoc) {
        throw new Error('File not found');
      }

      // Check if user owns the file or is admin
      if (fileDoc.uploadedBy.toString() !== userId) {
        throw new Error('You can only delete your own files');
      }

      // Delete from storage
      await this.storageService.deleteFile(fileDoc.fileUrl);

      if (fileDoc.thumbnailUrl) {
        await this.storageService.deleteFile(fileDoc.thumbnailUrl);
      }

      // Delete from database
      await File.findByIdAndDelete(fileId);

      logger.info('File deleted', {
        fileId,
        userId,
      });
    } catch (error) {
      logger.error('Failed to delete file', {
        fileId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async getUserFiles(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    files: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [files, total] = await Promise.all([
        File.find({ uploadedBy: new mongoose.Types.ObjectId(userId) })
          .populate('conversationId', 'name type')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        File.countDocuments({ uploadedBy: new mongoose.Types.ObjectId(userId) }),
      ]);

      return {
        files,
        total,
        hasMore: skip + files.length < total,
      };
    } catch (error) {
      logger.error('Failed to get user files', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async getConversationFiles(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    files: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [files, total] = await Promise.all([
        File.find({
          conversationId: new mongoose.Types.ObjectId(conversationId),
          uploadedBy: new mongoose.Types.ObjectId(userId),
        })
          .populate('uploadedBy', 'username firstName lastName profilePicture')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        File.countDocuments({
          conversationId: new mongoose.Types.ObjectId(conversationId),
          uploadedBy: new mongoose.Types.ObjectId(userId),
        }),
      ]);

      return {
        files,
        total,
        hasMore: skip + files.length < total,
      };
    } catch (error) {
      logger.error('Failed to get conversation files', {
        conversationId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async getFileById(fileId: string, userId: string): Promise<any> {
    try {
      const file = await File.findOne({
        _id: fileId,
        uploadedBy: new mongoose.Types.ObjectId(userId),
      }).populate('conversationId', 'name type');

      if (!file) {
        throw new Error('File not found');
      }

      return file;
    } catch (error) {
      logger.error('Failed to get file by ID', {
        fileId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
