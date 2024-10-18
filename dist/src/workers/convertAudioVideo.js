"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertAudioVideo = void 0;
var fs = __importStar(require("fs"));
var os = __importStar(require("os"));
var path = __importStar(require("path"));
var client_s3_1 = require("@aws-sdk/client-s3");
var ffmpeg_1 = __importDefault(require("@ffmpeg-installer/ffmpeg"));
var ffprobe_1 = __importDefault(require("@ffprobe-installer/ffprobe"));
var fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
var logger_1 = __importDefault(require("../lib/logger"));
var prisma_1 = __importDefault(require("../lib/prisma"));
var s3Client_1 = require("../lib/s3Client");
var ses_1 = require("../lib/ses");
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_1.default.path);
fluent_ffmpeg_1.default.setFfprobePath(ffprobe_1.default.path);
var DURATION_DIFF = 0.5;
var ERROR_CODES = {
    DURATION_DIFF_ERROR: { code: 'DURATION_DIFF_ERROR', httpCode: 400 }
};
function convertAudioVideo(fileKey, userEmailId) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, Body, tempFilePath, fileId, endTime, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.default.info("Processing file: ".concat(fileKey));
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, s3Client_1.s3Client.send(new client_s3_1.GetObjectCommand({
                            Bucket: process.env.AWS_S3_BUCKET_NAME,
                            Key: fileKey,
                        }))];
                case 2:
                    Body = (_a.sent()).Body;
                    tempFilePath = path.join(os.tmpdir(), path.basename(fileKey));
                    return [4 /*yield*/, saveStreamToFile(Body, tempFilePath)];
                case 3:
                    _a.sent();
                    fileId = (path.parse(fileKey)).name;
                    return [4 /*yield*/, convertToMp3Mp4(tempFilePath, fileKey, fileId, userEmailId)];
                case 4:
                    _a.sent();
                    fs.unlinkSync(tempFilePath);
                    endTime = Date.now();
                    logger_1.default.info("[".concat(fileKey, "] Processing completed. Total time: ").concat((endTime - startTime) / 1000, " seconds"));
                    return [2 /*return*/, fileId];
                case 5:
                    error_1 = _a.sent();
                    logger_1.default.error("Error processing file ".concat(fileKey, ": ").concat(error_1));
                    throw error_1;
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.convertAudioVideo = convertAudioVideo;
function saveStreamToFile(stream, filePath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var writeStream = fs.createWriteStream(filePath);
                    stream.pipe(writeStream);
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                })];
        });
    });
}
function getMetadataWithFFmpeg(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    fluent_ffmpeg_1.default.ffprobe(filePath, function (err, metadata) {
                        if (err) {
                            return reject(new Error('Invalid file'));
                        }
                        var duration = metadata.format.duration;
                        if (!duration) {
                            return reject(new Error('Duration not found'));
                        }
                        resolve(duration);
                    });
                })];
        });
    });
}
function convertToMp3Mp4(filePath, originalKey, fileId, userEmailId) {
    return __awaiter(this, void 0, void 0, function () {
        var fileExt, baseName, mp3Key, mp4Key, mp3Path, mp4Path, videoExtensions, isVideoFile;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fileExt = path.extname(originalKey).toLowerCase();
                    baseName = path.parse(originalKey).name;
                    mp3Key = "".concat(baseName, ".mp3");
                    mp4Key = "".concat(baseName, ".mp4");
                    mp3Path = path.join(os.tmpdir(), mp3Key);
                    mp4Path = path.join(os.tmpdir(), mp4Key);
                    videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.mpg', '.mpeg', '.m4v', '.3gp', '.mts', '.mp2t', '.ogv', '.mxf'];
                    isVideoFile = videoExtensions.includes(fileExt);
                    if (fileExt === '.mp3')
                        return [2 /*return*/];
                    if (!(fileExt === '.mp4')) return [3 /*break*/, 3];
                    return [4 /*yield*/, convertFile(filePath, mp3Path, 'mp3')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, uploadToS3(mp3Path, mp3Key)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
                case 3: return [2 /*return*/, new Promise(function (resolve, reject) {
                        var conversionPromises = [];
                        // Convert to MP3
                        conversionPromises.push(convertFile(filePath, mp3Path, 'mp3'));
                        // Convert to MP4 if it's a video file
                        if (isVideoFile) {
                            conversionPromises.push(convertFile(filePath, mp4Path, 'mp4'));
                        }
                        Promise.all(conversionPromises)
                            .then(function () { return __awaiter(_this, void 0, void 0, function () {
                            var err_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 7, , 8]);
                                        return [4 /*yield*/, uploadToS3(mp3Path, mp3Key)];
                                    case 1:
                                        _a.sent();
                                        if (!isVideoFile) return [3 /*break*/, 3];
                                        return [4 /*yield*/, uploadToS3(mp4Path, mp4Key)];
                                    case 2:
                                        _a.sent();
                                        _a.label = 3;
                                    case 3:
                                        if (!(fileExt !== '.mp3' && fileExt !== '.mp4')) return [3 /*break*/, 5];
                                        return [4 /*yield*/, deleteFromS3(originalKey)];
                                    case 4:
                                        _a.sent();
                                        _a.label = 5;
                                    case 5: return [4 /*yield*/, validateDuration(mp3Path, fileId, userEmailId)];
                                    case 6:
                                        _a.sent();
                                        // Clean up temp files
                                        fs.unlinkSync(mp3Path);
                                        if (isVideoFile) {
                                            fs.unlinkSync(mp4Path);
                                        }
                                        resolve();
                                        return [3 /*break*/, 8];
                                    case 7:
                                        err_1 = _a.sent();
                                        logger_1.default.error("Error in S3 operations: ".concat(err_1));
                                        reject(err_1);
                                        return [3 /*break*/, 8];
                                    case 8: return [2 /*return*/];
                                }
                            });
                        }); })
                            .catch(function (err) {
                            logger_1.default.error("Error during conversion: ".concat(err));
                            reject(err);
                        });
                    })];
            }
        });
    });
}
function convertFile(input, output, format) {
    return new Promise(function (resolve, reject) {
        var command = (0, fluent_ffmpeg_1.default)(input).outputFormat(format);
        if (format === 'mp4') {
            command = command.videoCodec('libx264').audioCodec('aac');
        }
        command
            .on('end', function () { return resolve(); })
            .on('error', function (err) { return reject(err); })
            .save(output);
    });
}
function validateDuration(filePath, fileId, userEmailId) {
    return __awaiter(this, void 0, void 0, function () {
        var duration, file, ses, emailData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getMetadataWithFFmpeg(filePath)];
                case 1:
                    duration = _a.sent();
                    return [4 /*yield*/, prisma_1.default.file.findUnique({
                            where: { fileId: fileId },
                            select: { duration: true }
                        })];
                case 2:
                    file = _a.sent();
                    if (!(file && Math.abs(file.duration - duration) > DURATION_DIFF)) return [3 /*break*/, 4];
                    ses = (0, ses_1.getAWSSesInstance)();
                    emailData = {
                        userEmailId: userEmailId || '',
                    };
                    return [4 /*yield*/, ses.sendMail('DURATION_DIFFERENCE_FLAGGED', emailData, {})];
                case 3:
                    _a.sent();
                    logger_1.default.info("".concat(fileId, " - File flagged for duration difference::").concat(ERROR_CODES.DURATION_DIFF_ERROR.code, "::").concat(ERROR_CODES.DURATION_DIFF_ERROR.httpCode));
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function uploadToS3(filePath, key) {
    return __awaiter(this, void 0, void 0, function () {
        var fileContent, putObjectCommand;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fileContent = fs.readFileSync(filePath);
                    putObjectCommand = new client_s3_1.PutObjectCommand({
                        Bucket: process.env.AWS_S3_BUCKET_NAME,
                        Key: key,
                        Body: fileContent,
                        Metadata: {
                            type: 'CONVERTED_FILE',
                        }
                    });
                    return [4 /*yield*/, s3Client_1.s3Client.send(putObjectCommand)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function deleteFromS3(key) {
    return __awaiter(this, void 0, void 0, function () {
        var deleteObjectCommand;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    deleteObjectCommand = new client_s3_1.DeleteObjectCommand({
                        Bucket: process.env.AWS_S3_BUCKET_NAME,
                        Key: key,
                    });
                    return [4 /*yield*/, s3Client_1.s3Client.send(deleteObjectCommand)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
