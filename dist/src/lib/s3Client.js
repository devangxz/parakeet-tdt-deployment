"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Client = void 0;
var client_s3_1 = require("@aws-sdk/client-s3");
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
    },
});
