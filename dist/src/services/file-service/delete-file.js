"use strict";
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
exports.deleteFile = exports.getListOfGeneratedFiles = void 0;
var client_s3_1 = require("@aws-sdk/client-s3");
var logger_1 = __importDefault(require("@/lib/logger"));
var prisma_1 = __importDefault(require("@/lib/prisma"));
var s3_client_1 = __importDefault(require("@/lib/s3-client"));
var getListOfGeneratedFiles = function (fileId) { return [
    "".concat(fileId, "_ris.docx"),
    "".concat(fileId, "_asr.txt"),
    "".concat(fileId, ".mp4"),
    "".concat(fileId, ".mp3"),
    "".concat(fileId, "_ctms.json"),
    "".concat(fileId, "_qc.txt"),
    "".concat(fileId, "_cf_rev.docx"),
    "".concat(fileId, "_transcript.docx"),
    "".concat(fileId, ".txt"),
]; };
exports.getListOfGeneratedFiles = getListOfGeneratedFiles;
function deleteFile(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var fileExists, keys, error_1;
        var _this = this;
        var userId = _b.userId, fileId = _b.fileId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, prisma_1.default.file.findUnique({
                            where: { fileId: fileId, userId: userId },
                        })];
                case 1:
                    fileExists = _c.sent();
                    if (!fileExists) {
                        logger_1.default.error("File with ID ".concat(fileId, " not found for user ").concat(userId));
                        return [2 /*return*/, { fileId: fileId, status: 'not found' }];
                    }
                    return [4 /*yield*/, prisma_1.default.file.update({
                            where: { fileId: fileId },
                            data: { deletedAt: new Date() },
                        })];
                case 2:
                    _c.sent();
                    keys = (0, exports.getListOfGeneratedFiles)(fileId);
                    return [4 /*yield*/, Promise.all(keys.map(function (key) { return __awaiter(_this, void 0, void 0, function () {
                            var command;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        command = new client_s3_1.DeleteObjectCommand({
                                            Bucket: process.env.AWS_S3_BUCKET_NAME,
                                            Key: key,
                                        });
                                        return [4 /*yield*/, s3_client_1.default.send(command)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 3:
                    _c.sent();
                    logger_1.default.info("File with ID ".concat(fileId, " deleted successfully by user ").concat(userId));
                    return [2 /*return*/, { fileId: fileId, status: 'deleted' }];
                case 4:
                    error_1 = _c.sent();
                    logger_1.default.error("Failed to delete file with ID ".concat(fileId, " for user ").concat(userId), error_1);
                    throw new Error('Failed to delete file');
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.deleteFile = deleteFile;
