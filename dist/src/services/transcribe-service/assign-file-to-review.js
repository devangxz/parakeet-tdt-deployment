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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var logger_1 = __importDefault(require("@/lib/logger"));
var prisma_1 = __importDefault(require("@/lib/prisma"));
var ses_1 = require("@/lib/ses");
var assignFileToReviewer = function (orderId_1, fileId_1, transcriberId_1, inputFile_1) {
    var args_1 = [];
    for (var _i = 4; _i < arguments.length; _i++) {
        args_1[_i - 4] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([orderId_1, fileId_1, transcriberId_1, inputFile_1], args_1, true), void 0, function (orderId, fileId, transcriberId, inputFile, changeOrderStatus) {
        var templateData, error_1;
        if (changeOrderStatus === void 0) { changeOrderStatus = true; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.default.info("--> assignFileToReviewer ".concat(orderId, " ").concat(transcriberId));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, prisma_1.default.$transaction(function (prisma) { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!changeOrderStatus) return [3 /*break*/, 2];
                                        return [4 /*yield*/, prisma.order.update({
                                                where: { id: orderId },
                                                data: {
                                                    status: client_1.OrderStatus.REVIEWER_ASSIGNED,
                                                    updatedAt: new Date(),
                                                },
                                            })];
                                    case 1:
                                        _a.sent();
                                        _a.label = 2;
                                    case 2: return [4 /*yield*/, prisma.jobAssignment.create({
                                            data: {
                                                orderId: orderId,
                                                type: client_1.JobType.REVIEW,
                                                transcriberId: transcriberId,
                                                inputFile: inputFile,
                                            },
                                        })];
                                    case 3:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 2:
                    _a.sent();
                    templateData = {
                        fileId: fileId,
                    };
                    return [4 /*yield*/, (0, ses_1.sendTemplateMail)('REVIEWER_ASSIGNMENT', transcriberId, templateData)];
                case 3:
                    _a.sent();
                    logger_1.default.info("--> assignFileToReviewer ".concat(orderId, " ").concat(transcriberId));
                    return [2 /*return*/, true];
                case 4:
                    error_1 = _a.sent();
                    logger_1.default.error("--> assignFileToReviewer " + error_1);
                    return [2 /*return*/, false];
                case 5: return [2 /*return*/];
            }
        });
    });
};
exports.default = assignFileToReviewer;
