/* eslint-disable @typescript-eslint/no-explicit-any */
import type mongoose from 'mongoose';

export interface FileUploadResult {
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  duration?: number;
  storage: 'firebase' | 's3';
}

export interface StorageService {
  uploadFile(file: Express.Multer.File, folder: string, options?: any): Promise<FileUploadResult>;

  deleteFile(url: string): Promise<void>;

  generateThumbnail?(file: Express.Multer.File): Promise<Buffer>;

  compressImage?(file: Express.Multer.File): Promise<Buffer>;
}

export interface IFile {
  _id: mongoose.Types.ObjectId;
  originalName: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  duration?: number;
  uploadedBy: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  storage: 'firebase' | 's3';
  isCompressed: boolean;
  compressionRatio?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFileDocument extends IFile, mongoose.Document {
  _id: mongoose.Types.ObjectId;
}
