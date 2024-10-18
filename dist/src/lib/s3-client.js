"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
var client_s3_1 = require("@aws-sdk/client-s3");
var s3Client = new client_s3_1.S3Client({
    credentials: {
        accessKeyId: (_a = process.env.AWS_S3_ACCESS_KEY_ID) !== null && _a !== void 0 ? _a : '',
        secretAccessKey: (_b = process.env.AWS_S3_SECRET_ACCESS_KEY) !== null && _b !== void 0 ? _b : '',
    },
    region: process.env.AWS_S3_REGION,
});
exports.default = s3Client;
