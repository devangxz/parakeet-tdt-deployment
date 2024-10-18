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
exports.processPayment = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
var client_1 = require("@prisma/client");
var logger_1 = __importDefault(require("@/lib/logger"));
var prisma_1 = __importDefault(require("@/lib/prisma"));
var ses_1 = require("@/lib/ses");
var backend_helper_1 = require("@/utils/backend-helper");
var addHours = function (date, hours) {
    var result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
};
var processPayment = function (invoiceId, type, orderType, transactionId, paidBy) { return __awaiter(void 0, void 0, void 0, function () {
    var ses, invoice, file_ids, invoiceOptions, _i, file_ids_1, fileId, tatHours, instructions, file, fileInfo_1, getEmails, emailData, instructionData, fileInfo, body_1, templateData, invoice, templateData, invoice, file_ids, _a, file_ids_2, fileId, error_1;
    var _b, _c, _d, _e, _f, _g, _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                ses = (0, ses_1.getAWSSesInstance)();
                _j.label = 1;
            case 1:
                _j.trys.push([1, 22, , 23]);
                if (!(type === client_1.InvoiceType.TRANSCRIPT)) return [3 /*break*/, 13];
                return [4 /*yield*/, prisma_1.default.invoice.findUnique({
                        where: { invoiceId: invoiceId },
                    })];
            case 2:
                invoice = _j.sent();
                if (!invoice) {
                    logger_1.default.error("Invoice not found ".concat(invoiceId));
                    return [2 /*return*/, false];
                }
                file_ids = (_c = (_b = invoice.itemNumber) === null || _b === void 0 ? void 0 : _b.split(',')) !== null && _c !== void 0 ? _c : [];
                invoiceOptions = JSON.parse((_d = invoice.options) !== null && _d !== void 0 ? _d : '{}');
                _i = 0, file_ids_1 = file_ids;
                _j.label = 3;
            case 3:
                if (!(_i < file_ids_1.length)) return [3 /*break*/, 8];
                fileId = file_ids_1[_i];
                tatHours = invoiceOptions.exd == 1 ? 12 : 24;
                instructions = invoice.instructions;
                if (!(orderType === client_1.OrderType.TRANSCRIPTION_FORMATTING)) return [3 /*break*/, 5];
                return [4 /*yield*/, prisma_1.default.file.findUnique({
                        where: {
                            fileId: fileId,
                        },
                    })];
            case 4:
                file = _j.sent();
                if (file) {
                    fileInfo_1 = JSON.parse((_e = file.customInstructions) !== null && _e !== void 0 ? _e : '{}');
                    if (fileInfo_1 && fileInfo_1.instructions) {
                        instructions = fileInfo_1.instructions;
                    }
                }
                _j.label = 5;
            case 5: return [4 /*yield*/, prisma_1.default.order.upsert({
                    where: {
                        fileId: fileId,
                    },
                    create: {
                        userId: invoice.userId,
                        fileId: fileId,
                        status: client_1.OrderStatus.PENDING,
                        priority: 0,
                        tat: tatHours,
                        deadlineTs: addHours(new Date(), tatHours),
                        deliveryTs: addHours(new Date(), tatHours),
                        instructions: instructions,
                        orderType: orderType,
                    },
                    update: {
                        status: client_1.OrderStatus.PENDING,
                        orderTs: new Date(),
                        deadlineTs: addHours(new Date(), tatHours),
                        deliveryTs: addHours(new Date(), tatHours),
                        instructions: invoice.instructions,
                    },
                })
                // TODO: add order service
                // await OrderService.add(order.id, OrderTrigger.CREATE_ORDER)
                // logger.info(`Order created for file ${fileId}`)
            ];
            case 6:
                _j.sent();
                _j.label = 7;
            case 7:
                _i++;
                return [3 /*break*/, 3];
            case 8: return [4 /*yield*/, (0, backend_helper_1.getEmailDetails)(invoice.userId, paidBy)];
            case 9:
                getEmails = _j.sent();
                if (!getEmails) {
                    logger_1.default.error("Emails not found for user ".concat(invoice.invoiceId));
                    return [2 /*return*/, true];
                }
                emailData = {
                    userEmailId: getEmails.email || '',
                };
                instructionData = { userEmailId: '' };
                return [4 /*yield*/, prisma_1.default.invoiceFile.findMany({
                        where: {
                            invoiceId: invoiceId,
                        },
                        include: {
                            File: true,
                        },
                    })];
            case 10:
                fileInfo = _j.sent();
                body_1 = '';
                fileInfo.forEach(function (file, index) {
                    body_1 += '<tr>';
                    body_1 += "<td style='text-align:center;border:1px solid #cccccc;padding:5px' align='center' border='1' cellpadding='5'>".concat(index + 1, "</td>");
                    body_1 += "<td style='text-align:left;border:1px solid #cccccc;padding:5px' align='left' border='1' cellpadding='5'><a target='_blank' href='https://".concat(process.env.SERVER, "/files/all-files/?ids=").concat(file.fileId, "'>").concat(file.File.filename, "</a></td>");
                    body_1 += "<td style='text-align:center;border:1px solid #cccccc;padding:5px' align='center' border='1' cellpadding='5'>".concat(new Date(file.createdAt).toLocaleDateString(), "</td>");
                    body_1 += "<td style='text-align:center;border:1px solid #cccccc;padding:5px' align='center' border='1' cellpadding='5'>$".concat(file.price.toFixed(2), "</td>");
                    body_1 += '</tr>';
                });
                templateData = {
                    file_url: "https://".concat(process.env.SERVER, "/files/all-files/?ids=").concat(invoice.itemNumber),
                    rate_name: 'Manual (24 hours)',
                    transaction_id: transactionId,
                    payment_url: "https://".concat(process.env.SERVER, "/payments?id=").concat(invoice.invoiceId),
                    invoice_id: invoice.invoiceId,
                    disclaimer: 'Additional charges may apply for files with non-American accents, poor audio quality, distortions, distant speakers, high background and/or ambient noise. A full refund will be issued if the additional charges is unacceptable, or if the file is un-transcribeable.',
                    files: body_1,
                };
                return [4 /*yield*/, ses.sendMail('ORDER_CONFIRMATION', emailData, templateData)];
            case 11:
                _j.sent();
                if (!invoice.instructions) return [3 /*break*/, 13];
                return [4 /*yield*/, ses.sendMail('SEND_INSTRUCTIONS', instructionData, {
                        instructions: invoice.instructions,
                        customerEmail: getEmails.email || '',
                        fileIds: (_f = invoice.itemNumber) !== null && _f !== void 0 ? _f : '',
                    })];
            case 12:
                _j.sent();
                _j.label = 13;
            case 13:
                if (!(type === client_1.InvoiceType.ADD_CREDITS)) return [3 /*break*/, 16];
                return [4 /*yield*/, prisma_1.default.invoice.findUnique({
                        where: { invoiceId: invoiceId },
                    })];
            case 14:
                invoice = _j.sent();
                if (!invoice) {
                    logger_1.default.error("Invoice not found ".concat(invoiceId));
                    return [2 /*return*/, false];
                }
                templateData = {
                    amount: invoice.amount.toFixed(2),
                };
                return [4 /*yield*/, (0, ses_1.sendTemplateMail)('ADD_CREDITS', invoice.userId, templateData)];
            case 15:
                _j.sent();
                _j.label = 16;
            case 16:
                if (!(type === client_1.InvoiceType.ADDL_FORMATTING ||
                    type === client_1.InvoiceType.ADDL_PROOFREADING)) return [3 /*break*/, 21];
                return [4 /*yield*/, prisma_1.default.invoice.findUnique({
                        where: { invoiceId: invoiceId },
                    })];
            case 17:
                invoice = _j.sent();
                if (!invoice) {
                    logger_1.default.error("Invoice not found ".concat(invoiceId));
                    return [2 /*return*/, false];
                }
                file_ids = (_h = (_g = invoice.itemNumber) === null || _g === void 0 ? void 0 : _g.split(',')) !== null && _h !== void 0 ? _h : [];
                _a = 0, file_ids_2 = file_ids;
                _j.label = 18;
            case 18:
                if (!(_a < file_ids_2.length)) return [3 /*break*/, 21];
                fileId = file_ids_2[_a];
                return [4 /*yield*/, prisma_1.default.order.update({
                        where: {
                            fileId: fileId,
                        },
                        data: {
                            status: client_1.OrderStatus.TRANSCRIBED,
                            updatedAt: new Date(),
                            highDifficulty: false,
                            deliveryTs: addHours(new Date(), 24),
                        },
                    })];
            case 19:
                _j.sent();
                _j.label = 20;
            case 20:
                _a++;
                return [3 /*break*/, 18];
            case 21: return [2 /*return*/, true];
            case 22:
                error_1 = _j.sent();
                logger_1.default.error("Failed to create order for ".concat(invoiceId), error_1);
                return [2 /*return*/, false];
            case 23: return [2 /*return*/];
        }
    });
}); };
exports.processPayment = processPayment;
