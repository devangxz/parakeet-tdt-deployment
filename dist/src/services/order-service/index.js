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
exports.orderFiles = void 0;
var client_1 = require("@prisma/client");
var constants_1 = require("@/constants");
var logger_1 = __importDefault(require("@/lib/logger"));
var prisma_1 = __importDefault(require("@/lib/prisma"));
var backend_helper_1 = require("@/utils/backend-helper");
var calculatePrice = function (duration, rate) {
    return Math.round(((duration * rate) / 60) * 100) / 100;
};
var orderFiles = function (userId, internalTeamUserId, fileIds, orderType, customPlan) { return __awaiter(void 0, void 0, void 0, function () {
    var options, files, _loop_1, _i, fileIds_1, fileId, state_1, invoiceId, totalPrice, filesInfo, teamAdminUserId, rate, rates, customFormattingRate, customPlanRates, _a, files_1, file, price, customPlanRates_1, discountRate, discount, itemNumber, instruction, invoiceData, invoice, _b, filesInfo_1, file;
    var _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0: return [4 /*yield*/, (0, backend_helper_1.getOrderOptions)(userId)];
            case 1:
                options = _f.sent();
                if (!constants_1.ORDER_TYPES.includes(orderType)) {
                    logger_1.default.error("Invalid order type ".concat(orderType, " for filed ").concat(fileIds.join(','), " by ").concat(userId));
                    return [2 /*return*/, {
                            success: false,
                            message: 'Invalid order type',
                        }];
                }
                // Delete any pending transcript invoices for the files
                return [4 /*yield*/, prisma_1.default.invoice.deleteMany({
                        where: {
                            itemNumber: fileIds.join(','),
                            type: client_1.InvoiceType.TRANSCRIPT,
                            status: client_1.InvoiceStatus.PENDING,
                            userId: userId,
                        },
                    })
                    // Delete any pending transcript invoice files for the files
                ];
            case 2:
                // Delete any pending transcript invoices for the files
                _f.sent();
                // Delete any pending transcript invoice files for the files
                return [4 /*yield*/, prisma_1.default.invoiceFile.deleteMany({
                        where: {
                            fileId: {
                                in: fileIds,
                            },
                        },
                    })];
            case 3:
                // Delete any pending transcript invoice files for the files
                _f.sent();
                files = [];
                _loop_1 = function (fileId) {
                    var fileWithOrder, error_1;
                    return __generator(this, function (_g) {
                        switch (_g.label) {
                            case 0:
                                _g.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, prisma_1.default.file.findUnique({
                                        where: { fileId: fileId },
                                        include: { Orders: true },
                                    })];
                            case 1:
                                fileWithOrder = _g.sent();
                                if (!fileWithOrder) {
                                    logger_1.default.error("file not found for ".concat(fileId, ", ").concat(userId));
                                    return [2 /*return*/, { value: {
                                                success: false,
                                                message: 'File not found',
                                            } }];
                                }
                                if (fileWithOrder.Orders.length === 0 ||
                                    fileWithOrder.Orders.every(function (order) {
                                        return ['REJECTED', 'CANCELLED', 'REFUNDED'].includes(order.status);
                                    })) {
                                    files.push({
                                        filename: (_c = fileWithOrder.filename) !== null && _c !== void 0 ? _c : '',
                                        fileId: fileId,
                                        duration: (_d = fileWithOrder.duration) !== null && _d !== void 0 ? _d : 0,
                                        price: 0,
                                    });
                                }
                                else {
                                    fileWithOrder.Orders.forEach(function (order) {
                                        if (!['REJECTED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
                                            logger_1.default.error("file already ordered ".concat(fileId, ", ").concat(userId));
                                        }
                                    });
                                }
                                if (fileWithOrder.duration > 3600 * constants_1.FILE_UPLOAD_LIMIT_IN_HOUR) {
                                    logger_1.default.error("attempt to order 10 hour plus file, ".concat(fileWithOrder.duration, ", ").concat(userId));
                                    return [2 /*return*/, { value: {
                                                success: false,
                                                message: 'Files cannot be longer than 10 hours. Please try trimming it.',
                                            } }];
                                }
                                return [3 /*break*/, 3];
                            case 2:
                                error_1 = _g.sent();
                                logger_1.default.error("Failed to fetch file ".concat(fileId), error_1);
                                return [2 /*return*/, { value: {
                                            success: false,
                                            message: 'An error occurred. Please try again after some time.',
                                        } }];
                            case 3: return [2 /*return*/];
                        }
                    });
                };
                _i = 0, fileIds_1 = fileIds;
                _f.label = 4;
            case 4:
                if (!(_i < fileIds_1.length)) return [3 /*break*/, 7];
                fileId = fileIds_1[_i];
                return [5 /*yield**/, _loop_1(fileId)];
            case 5:
                state_1 = _f.sent();
                if (typeof state_1 === "object")
                    return [2 /*return*/, state_1.value];
                _f.label = 6;
            case 6:
                _i++;
                return [3 /*break*/, 4];
            case 7:
                if (files.length === 0) {
                    logger_1.default.error("file's not found for ".concat(userId));
                    return [2 /*return*/, {
                            success: false,
                            message: 'No valid files found.',
                        }];
                }
                invoiceId = (0, backend_helper_1.generateInvoiceId)('CGT');
                totalPrice = 0;
                filesInfo = [];
                return [4 /*yield*/, (0, backend_helper_1.getTeamSuperAdminUserId)(internalTeamUserId, userId)];
            case 8:
                teamAdminUserId = _f.sent();
                return [4 /*yield*/, (0, backend_helper_1.getRate)(teamAdminUserId, customPlan)];
            case 9:
                rate = _f.sent();
                rates = {
                    vb: constants_1.VERBATIM_PRICE,
                    ro: constants_1.RUSH_PRICE,
                };
                customFormattingRate = 0;
                return [4 /*yield*/, (0, backend_helper_1.getUserRate)(teamAdminUserId)];
            case 10:
                customPlanRates = _f.sent();
                if (!customPlanRates) {
                    rates = {
                        vb: constants_1.VERBATIM_PRICE,
                        ro: constants_1.RUSH_PRICE,
                    };
                }
                else {
                    rates = {
                        vb: customPlanRates.sv,
                        ro: customPlanRates.ro,
                    };
                }
                if (!rate || !options) {
                    logger_1.default.error("Failed to fetch rate or options for ".concat(userId));
                    return [2 /*return*/, {
                            success: false,
                            message: 'An error occurred. Please try again after some time.',
                        }];
                }
                _a = 0, files_1 = files;
                _f.label = 11;
            case 11:
                if (!(_a < files_1.length)) return [3 /*break*/, 15];
                file = files_1[_a];
                price = calculatePrice(file.duration, rate);
                if (!(orderType === client_1.OrderType.TRANSCRIPTION_FORMATTING)) return [3 /*break*/, 13];
                return [4 /*yield*/, (0, backend_helper_1.getUserRate)(teamAdminUserId)];
            case 12:
                customPlanRates_1 = _f.sent();
                if (!customPlanRates_1) {
                    logger_1.default.error("Failed to fetch custom plan rates for ".concat(teamAdminUserId));
                    return [2 /*return*/, {
                            success: false,
                            message: 'An error occurred. Please try again after some time.',
                        }];
                }
                rates = {
                    vb: customPlanRates_1.sv,
                    ro: customPlanRates_1.ro,
                };
                price += calculatePrice(file.duration, customPlanRates_1.cf);
                customFormattingRate = customPlanRates_1.cf;
                _f.label = 13;
            case 13:
                // Calculate additional costs based on selected options
                if (options.vb === 1) {
                    price += calculatePrice(file.duration, rates.vb);
                }
                if (options.exd === 1) {
                    price += calculatePrice(file.duration, rates.ro);
                }
                filesInfo.push({
                    filename: file.filename,
                    fileId: file.fileId,
                    duration: file.duration,
                    price: price,
                });
                totalPrice += price;
                _f.label = 14;
            case 14:
                _a++;
                return [3 /*break*/, 11];
            case 15: return [4 /*yield*/, (0, backend_helper_1.getDiscountRate)(teamAdminUserId)];
            case 16:
                discountRate = _f.sent();
                discount = (totalPrice * discountRate).toFixed(2);
                itemNumber = files.map(function (file) { return file.fileId; }).join(',');
                return [4 /*yield*/, prisma_1.default.defaultInstruction.findUnique({
                        where: {
                            userId: userId,
                        },
                        select: {
                            instructions: true,
                        },
                    })];
            case 17:
                instruction = _f.sent();
                invoiceData = {
                    invoiceId: invoiceId,
                    type: client_1.InvoiceType.TRANSCRIPT,
                    userId: userId,
                    amount: Number(totalPrice.toFixed(2)),
                    discount: Number(discount),
                    itemNumber: itemNumber,
                    options: JSON.stringify(options),
                    instructions: (_e = instruction === null || instruction === void 0 ? void 0 : instruction.instructions) !== null && _e !== void 0 ? _e : '',
                    orderRate: Number((rate + customFormattingRate).toFixed(2)),
                };
                return [4 /*yield*/, prisma_1.default.invoice.create({
                        data: invoiceData,
                    })];
            case 18:
                invoice = _f.sent();
                if (!invoice) {
                    logger_1.default.error("Failed to create invoice ".concat(invoiceId));
                    return [2 /*return*/, {
                            success: false,
                            message: 'An error occurred. Please try again after some time.',
                        }];
                }
                _b = 0, filesInfo_1 = filesInfo;
                _f.label = 19;
            case 19:
                if (!(_b < filesInfo_1.length)) return [3 /*break*/, 22];
                file = filesInfo_1[_b];
                return [4 /*yield*/, prisma_1.default.invoiceFile.create({
                        data: {
                            invoiceId: invoiceId,
                            fileId: file.fileId,
                            price: file.price,
                        },
                    })];
            case 20:
                _f.sent();
                _f.label = 21;
            case 21:
                _b++;
                return [3 /*break*/, 19];
            case 22:
                logger_1.default.info("Order created for ".concat(invoiceId, " for ").concat(userId));
                return [2 /*return*/, {
                        success: true,
                        message: 'Order created successfully',
                        inv: invoiceId,
                        totalAmount: totalPrice,
                        rates: rates,
                    }];
        }
    });
}); };
exports.orderFiles = orderFiles;
