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
var client_1 = require("@prisma/client");
var prisma_1 = __importDefault(require("@/lib/prisma"));
;
var saveFileMetadata = function (metadata) { return __awaiter(void 0, void 0, void 0, function () {
    var fileSize, duration, userId, isDuplicate, existingFile, err_1, fileData;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                fileSize = BigInt(Math.floor((_a = metadata === null || metadata === void 0 ? void 0 : metadata.fileSize) !== null && _a !== void 0 ? _a : 0));
                duration = Math.floor(Number((_c = (_b = metadata === null || metadata === void 0 ? void 0 : metadata.duration) === null || _b === void 0 ? void 0 : _b.toFixed(2)) !== null && _c !== void 0 ? _c : 0));
                userId = Number(metadata === null || metadata === void 0 ? void 0 : metadata.userId);
                isDuplicate = false;
                _f.label = 1;
            case 1:
                _f.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.file.findFirst({
                        where: {
                            filename: metadata === null || metadata === void 0 ? void 0 : metadata.fileName,
                            userId: userId,
                            NOT: {
                                fileId: metadata === null || metadata === void 0 ? void 0 : metadata.fileId,
                            },
                        },
                    })];
            case 2:
                existingFile = _f.sent();
                isDuplicate = existingFile !== null;
                return [3 /*break*/, 4];
            case 3:
                err_1 = _f.sent();
                console.error('Error checking for duplicate file:', err_1.message);
                throw new Error('Error checking for duplicate file');
            case 4:
                fileData = {
                    userId: userId,
                    filename: (_d = metadata === null || metadata === void 0 ? void 0 : metadata.fileName) !== null && _d !== void 0 ? _d : '',
                    fileId: (_e = metadata === null || metadata === void 0 ? void 0 : metadata.fileId) !== null && _e !== void 0 ? _e : '',
                    duration: duration,
                    bitRate: (metadata === null || metadata === void 0 ? void 0 : metadata.bitRate) ? Number(metadata.bitRate) : null,
                    sampleRate: (metadata === null || metadata === void 0 ? void 0 : metadata.sampleRate) ? Number(metadata.sampleRate) : null,
                    filesize: fileSize,
                    uploadedBy: userId,
                    fileStatus: isDuplicate ? client_1.FileStatus.DUPLICATE : client_1.FileStatus.NONE,
                };
                return [4 /*yield*/, prisma_1.default.file.create({
                        data: fileData,
                    })];
            case 5:
                _f.sent();
                if (!isDuplicate) return [3 /*break*/, 7];
                return [4 /*yield*/, prisma_1.default.file.findMany({
                        where: {
                            filename: metadata === null || metadata === void 0 ? void 0 : metadata.fileName,
                            userId: userId,
                            NOT: {
                                fileId: metadata === null || metadata === void 0 ? void 0 : metadata.fileId,
                            },
                        },
                        select: {
                            fileId: true,
                        },
                    })];
            case 6:
                _f.sent();
                _f.label = 7;
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.default = saveFileMetadata;
