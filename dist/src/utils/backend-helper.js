"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileVersionFromS3 = exports.deleteFileVersionFromS3 = exports.downloadFromS3 = exports.uploadToS3 = exports.fileExistsInS3 = exports.checkTranscriberPayment = exports.processTranscriberPayment = exports.getAssignmentEarnings = exports.getTranscriberTodayCreditedHours = exports.getTranscriberCreditedHours = exports.getWithdrawalsBonusesAndMiscEarnings = exports.checkExistingAssignment = exports.getCustomerRate = exports.isTranscriberICQC = exports.getTeamSuperAdminEmailAndTeamName = exports.processRefund = exports.getRefundAmount = exports.getOrderStatus = exports.getEmailDetails = exports.generateUniqueTransactionId = exports.applyCredits = exports.getCreditsBalance = exports.getCreditsPreferences = exports.checkBraintreeCustomer = exports.getDiscountRate = exports.getRate = exports.getUserRate = exports.getTeamSuperAdminUserId = exports.getTeamAdminUserDetails = exports.generateInvoiceId = exports.getOrderOptions = void 0;
var crypto_1 = __importDefault(require("crypto"));
var stream_1 = require("stream");
var client_s3_1 = require("@aws-sdk/client-s3");
var payouts_sdk_1 = __importDefault(require("@paypal/payouts-sdk"));
var client_1 = require("@prisma/client");
var config_json_1 = __importDefault(require("../../config.json"));
var constants_1 = require("../constants");
var braintree_1 = __importDefault(require("../lib/braintree"));
var logger_1 = __importDefault(require("../lib/logger"));
var paypal_1 = __importDefault(require("../lib/paypal"));
var prisma_1 = __importDefault(require("../lib/prisma"));
var s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_S3_REGION,
    credentials: {
        accessKeyId: (_a = process.env.AWS_S3_ACCESS_KEY_ID) !== null && _a !== void 0 ? _a : '',
        secretAccessKey: (_b = process.env.AWS_S3_SECRET_ACCESS_KEY) !== null && _b !== void 0 ? _b : '',
    },
});
var getOrderOptions = function (userId) { return __awaiter(void 0, void 0, void 0, function () {
    var options, result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                options = constants_1.DEFAULT_ORDER_OPTIONS;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.defaultOption.findUnique({
                        where: { userId: userId },
                    })];
            case 2:
                result = _a.sent();
                if (result && result.options) {
                    options = __assign(__assign({}, options), JSON.parse(result.options));
                }
                logger_1.default.info("Order options for user ".concat(userId, ":"), options);
                return [2 /*return*/, options];
            case 3:
                error_1 = _a.sent();
                logger_1.default.error('Failed to get order options:', error_1);
                return [2 /*return*/, null];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getOrderOptions = getOrderOptions;
var generateInvoiceId = function (prefix) {
    var uniqueId = crypto_1.default.randomBytes(8).toString('hex');
    return "".concat(prefix).concat(uniqueId.toUpperCase());
};
exports.generateInvoiceId = generateInvoiceId;
var getTeamAdminUserDetails = function (internalAdminUserId) { return __awaiter(void 0, void 0, void 0, function () {
    var teamMember, adminTeamMember, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.teamMember.findFirst({
                        where: {
                            userId: internalAdminUserId,
                            role: client_1.TeamMemberRole.INTERNAL_TEAM_USER,
                        },
                    })];
            case 1:
                teamMember = _a.sent();
                if (!teamMember) {
                    logger_1.default.error("No team found with the given internal admin user ID ".concat(internalAdminUserId));
                    return [2 /*return*/, false];
                }
                return [4 /*yield*/, prisma_1.default.teamMember.findFirst({
                        where: {
                            teamId: teamMember.teamId,
                            role: client_1.TeamMemberRole.SUPER_ADMIN,
                        },
                        include: {
                            user: true,
                        },
                    })];
            case 2:
                adminTeamMember = _a.sent();
                if (!adminTeamMember) {
                    logger_1.default.error("No admin found for the team ".concat(teamMember.teamId));
                    return [2 /*return*/, false];
                }
                return [2 /*return*/, {
                        email: adminTeamMember.user.email,
                        userId: adminTeamMember.userId,
                    }];
            case 3:
                err_1 = _a.sent();
                logger_1.default.error('Failed to get team admin user details:', err_1);
                return [2 /*return*/, false];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getTeamAdminUserDetails = getTeamAdminUserDetails;
var getTeamSuperAdminUserId = function (internalTeamUserId, userId) { return __awaiter(void 0, void 0, void 0, function () {
    var teamAdminDetails, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!internalTeamUserId) return [3 /*break*/, 2];
                return [4 /*yield*/, (0, exports.getTeamAdminUserDetails)(userId)];
            case 1:
                _a = _b.sent();
                return [3 /*break*/, 3];
            case 2:
                _a = null;
                _b.label = 3;
            case 3:
                teamAdminDetails = _a;
                if (teamAdminDetails) {
                    return [2 /*return*/, teamAdminDetails.userId];
                }
                else {
                    return [2 /*return*/, userId];
                }
                return [2 /*return*/];
        }
    });
}); };
exports.getTeamSuperAdminUserId = getTeamSuperAdminUserId;
var getUserRate = function (userId) { return __awaiter(void 0, void 0, void 0, function () {
    var userRate, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.default.userRate.findUnique({
                        where: {
                            userId: userId,
                        },
                    })];
            case 1:
                userRate = _a.sent();
                if (!userRate) {
                    logger_1.default.info("No rates found for user ID ".concat(userId));
                    return [2 /*return*/, false];
                }
                logger_1.default.info("User rates for user ID ".concat(userId, ":"), userRate);
                return [2 /*return*/, {
                        manual: userRate.manualRate,
                        sv: userRate.svRate,
                        ac: userRate.addChargeRate,
                        atc: userRate.audioTimeCoding,
                        ro: userRate.rushOrder || 0,
                        cf: userRate.customFormat,
                    }];
            case 2:
                error_2 = _a.sent();
                logger_1.default.error('Failed to fetch user rates:', error_2);
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getUserRate = getUserRate;
var getRate = function (userId, customPlan) { return __awaiter(void 0, void 0, void 0, function () {
    var rateIndex, rate;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                rateIndex = 1;
                if (!customPlan) return [3 /*break*/, 2];
                return [4 /*yield*/, (0, exports.getUserRate)(userId)];
            case 1:
                rate = _a.sent();
                if (!rate) {
                    return [2 /*return*/, false];
                }
                return [2 /*return*/, rate.manual];
            case 2: return [2 /*return*/, constants_1.RATES[rateIndex].price];
        }
    });
}); };
exports.getRate = getRate;
var getDiscountRate = function (userId) { return __awaiter(void 0, void 0, void 0, function () {
    var customer, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.default.customer.findUnique({
                        where: {
                            userId: userId,
                        },
                    })];
            case 1:
                customer = _a.sent();
                if (!customer) {
                    logger_1.default.error("No customer entry found for ".concat(userId));
                    return [2 /*return*/, 0];
                }
                logger_1.default.info("Discount rate for user ID ".concat(userId, ":"), customer.discountRate);
                return [2 /*return*/, customer.discountRate];
            case 2:
                error_3 = _a.sent();
                logger_1.default.error('Failed to fetch discount rate:', error_3);
                return [2 /*return*/, 0];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getDiscountRate = getDiscountRate;
var checkBraintreeCustomer = function (userId) { return __awaiter(void 0, void 0, void 0, function () {
    var braintreeCustomer, err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, braintree_1.default.customer.find(userId.toString())];
            case 1:
                braintreeCustomer = _a.sent();
                if (braintreeCustomer) {
                    return [2 /*return*/, true];
                }
                return [2 /*return*/, false];
            case 2:
                err_2 = _a.sent();
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.checkBraintreeCustomer = checkBraintreeCustomer;
var getCreditsPreferences = function (userId) { return __awaiter(void 0, void 0, void 0, function () {
    var customer, err_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.default.customer.findUnique({
                        where: {
                            userId: userId,
                        },
                    })];
            case 1:
                customer = _a.sent();
                if (!customer) {
                    return [2 /*return*/, false];
                }
                return [2 /*return*/, customer.useCreditsDefault];
            case 2:
                err_3 = _a.sent();
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getCreditsPreferences = getCreditsPreferences;
var getCreditsBalance = function (userId) { return __awaiter(void 0, void 0, void 0, function () {
    var invoices, creditsBalance, roundedCreditsBalance, err_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.default.invoice.findMany({
                        where: {
                            userId: userId,
                            type: {
                                in: [
                                    client_1.InvoiceType.TRANSCRIPT,
                                    client_1.InvoiceType.ADDL_FORMATTING,
                                    client_1.InvoiceType.ADDL_PROOFREADING,
                                    client_1.InvoiceType.ADD_CREDITS,
                                    client_1.InvoiceType.FREE_CREDITS,
                                ],
                            },
                            status: {
                                in: [client_1.InvoiceStatus.PAID, client_1.InvoiceStatus.BILLED],
                            },
                        },
                    })];
            case 1:
                invoices = _a.sent();
                creditsBalance = invoices.reduce(function (acc, invoice) {
                    if (['ADD_CREDITS', 'FREE_CREDITS'].includes(invoice.type)) {
                        return acc + (invoice.amount - invoice.refundAmount);
                    }
                    else {
                        return acc + (invoice.creditsRefunded - invoice.creditsUsed);
                    }
                }, 0);
                roundedCreditsBalance = Math.round(creditsBalance * 100) / 100;
                return [2 /*return*/, roundedCreditsBalance || 0];
            case 2:
                err_4 = _a.sent();
                return [2 /*return*/, 0];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getCreditsBalance = getCreditsBalance;
var applyCredits = function (invoiceId, userId) { return __awaiter(void 0, void 0, void 0, function () {
    var creditsBalance, invoice, total, creditsUsed, err_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                return [4 /*yield*/, (0, exports.getCreditsBalance)(userId)];
            case 1:
                creditsBalance = _a.sent();
                if (!(creditsBalance <= 0)) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma_1.default.invoice.update({
                        where: {
                            invoiceId: invoiceId,
                        },
                        data: {
                            creditsUsed: 0,
                        },
                    })];
            case 2:
                _a.sent();
                return [2 /*return*/, false];
            case 3: return [4 /*yield*/, prisma_1.default.invoice.findUnique({
                    where: {
                        invoiceId: invoiceId,
                    },
                })];
            case 4:
                invoice = _a.sent();
                if (!invoice) {
                    return [2 /*return*/, false];
                }
                total = (invoice.amount - invoice.discount).toFixed(2);
                creditsUsed = creditsBalance >= parseFloat(total) ? parseFloat(total) : creditsBalance;
                return [4 /*yield*/, prisma_1.default.invoice.update({
                        where: {
                            invoiceId: invoiceId,
                        },
                        data: {
                            creditsUsed: Number(creditsUsed.toFixed(2)),
                        },
                    })];
            case 5:
                _a.sent();
                return [2 /*return*/, creditsUsed];
            case 6:
                err_5 = _a.sent();
                return [2 /*return*/, false];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.applyCredits = applyCredits;
var generateUniqueTransactionId = function () {
    var NUMBER = 0x75bcd15;
    var now = Date.now();
    var time = Math.floor(now / 1000).toString(16);
    var random = Math.floor(Math.random() * NUMBER)
        .toString(16)
        .padStart(5, '0');
    return time + random;
};
exports.generateUniqueTransactionId = generateUniqueTransactionId;
var getEmailDetails = function (userId_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([userId_1], args_1, true), void 0, function (userId, paidBy) {
        var user, preferences, teamMemberWhoOrdered, orderUserDetails, teamMember, getTeamMembers, err_6;
        if (paidBy === void 0) { paidBy = 0; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    return [4 /*yield*/, prisma_1.default.user.findUnique({
                            where: {
                                id: userId,
                            },
                        })];
                case 1:
                    user = _a.sent();
                    if (!user) {
                        logger_1.default.error("No user found with the given user ID ".concat(userId));
                        return [2 /*return*/, false];
                    }
                    if (!(user.role !== client_1.Role.INTERNAL_TEAM_USER)) return [3 /*break*/, 2];
                    return [2 /*return*/, {
                            email: user.email,
                            cc: [],
                        }];
                case 2: return [4 /*yield*/, prisma_1.default.customerNotifyPrefs.findUnique({
                        where: {
                            userId: userId,
                        },
                    })];
                case 3:
                    preferences = _a.sent();
                    if (!preferences) return [3 /*break*/, 5];
                    teamMemberWhoOrdered = preferences.teamMemberWhoOrdered;
                    if (!teamMemberWhoOrdered) return [3 /*break*/, 5];
                    return [4 /*yield*/, prisma_1.default.user.findUnique({
                            where: {
                                id: paidBy,
                            },
                        })];
                case 4:
                    orderUserDetails = _a.sent();
                    return [2 /*return*/, {
                            email: orderUserDetails === null || orderUserDetails === void 0 ? void 0 : orderUserDetails.email,
                            cc: [],
                        }];
                case 5: return [4 /*yield*/, prisma_1.default.teamMember.findFirst({
                        where: {
                            userId: userId,
                            role: 'INTERNAL_TEAM_USER',
                        },
                    })];
                case 6:
                    teamMember = _a.sent();
                    if (!teamMember) {
                        logger_1.default.error("No team found with the given internal admin user ID ".concat(userId));
                        return [2 /*return*/, false];
                    }
                    return [4 /*yield*/, prisma_1.default.teamMember.findMany({
                            where: {
                                teamId: teamMember.teamId,
                                role: {
                                    not: 'INTERNAL_TEAM_USER',
                                },
                            },
                            include: {
                                user: true,
                            },
                        })];
                case 7:
                    getTeamMembers = _a.sent();
                    return [2 /*return*/, {
                            email: getTeamMembers.filter(function (member) { return member.role === 'SUPER_ADMIN'; })[0].user.email,
                            cc: getTeamMembers
                                .filter(function (member) { return member.role !== 'SUPER_ADMIN'; })
                                .map(function (member) { return member.user.email; }),
                        }];
                case 8: return [3 /*break*/, 10];
                case 9:
                    err_6 = _a.sent();
                    return [2 /*return*/, false];
                case 10: return [2 /*return*/];
            }
        });
    });
};
exports.getEmailDetails = getEmailDetails;
var getOrderStatus = function (orderId) { return __awaiter(void 0, void 0, void 0, function () {
    var statusWeights, order, err_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                statusWeights = {
                    PENDING: config_json_1.default.order_status_weights.pending,
                    TRANSCRIBED: config_json_1.default.order_status_weights.transcribed,
                    QC_ASSIGNED: config_json_1.default.order_status_weights.qc_assigned,
                    QC_COMPLETED: config_json_1.default.order_status_weights.qc_completed,
                    FORMATTED: config_json_1.default.order_status_weights.formatted,
                    REVIEWER_ASSIGNED: config_json_1.default.order_status_weights.reviewer_assigned,
                    REVIEW_COMPLETED: config_json_1.default.order_status_weights.reviewer_completed,
                    DELIVERED: config_json_1.default.order_status_weights.delivered,
                    CANCELLED: config_json_1.default.order_status_weights.cancelled,
                    REFUNDED: config_json_1.default.order_status_weights.refunded,
                    BLOCKED: config_json_1.default.order_status_weights.blocked,
                };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.order.findUnique({
                        where: { id: orderId },
                        select: { status: true },
                    })];
            case 2:
                order = _a.sent();
                if (!order) {
                    return [2 /*return*/, false];
                }
                return [2 /*return*/, statusWeights[order.status]];
            case 3:
                err_7 = _a.sent();
                return [2 /*return*/, false];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getOrderStatus = getOrderStatus;
var getRefundAmount = function (fileId) { return __awaiter(void 0, void 0, void 0, function () {
    var invoiceFile, invoice, chargeRate, refundAmount, err_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.invoiceFile.findFirst({
                        where: {
                            fileId: fileId,
                        },
                    })];
            case 1:
                invoiceFile = _a.sent();
                if (!invoiceFile) {
                    return [2 /*return*/, false];
                }
                return [4 /*yield*/, prisma_1.default.invoice.findUnique({
                        where: {
                            invoiceId: invoiceFile.invoiceId,
                        },
                    })];
            case 2:
                invoice = _a.sent();
                if (!invoice) {
                    return [2 /*return*/, false];
                }
                chargeRate = (invoice.discount / invoice.amount).toFixed(2);
                refundAmount = (invoiceFile.price * parseFloat(chargeRate)).toFixed(2);
                return [2 /*return*/, refundAmount];
            case 3:
                err_8 = _a.sent();
                return [2 /*return*/, false];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getRefundAmount = getRefundAmount;
var processRefund = function (transactionId, refundAmount, invoiceId, refundToCredits) { return __awaiter(void 0, void 0, void 0, function () {
    var invoice, paymentMethod, creditsUsed, amount, discount, refundedAmount, chargedAmount, creditsRefunded, result, creditsRefund, transaction, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 16, , 17]);
                return [4 /*yield*/, prisma_1.default.invoice.findUnique({
                        where: { invoiceId: invoiceId },
                    })];
            case 1:
                invoice = _a.sent();
                if (!invoice) {
                    logger_1.default.error("Invoice ".concat(invoiceId, " not found"));
                    return [2 /*return*/, false];
                }
                paymentMethod = invoice.paymentMethod, creditsUsed = invoice.creditsUsed, amount = invoice.amount, discount = invoice.discount, refundedAmount = invoice.refundAmount;
                chargedAmount = parseFloat((amount - discount - creditsUsed).toFixed(2));
                creditsRefunded = invoice.creditsRefunded;
                result = null;
                if (!(refundAmount > 0)) return [3 /*break*/, 15];
                if (!(paymentMethod === client_1.PaymentMethod.CREDITS || refundToCredits)) return [3 /*break*/, 2];
                creditsRefunded += parseFloat(refundAmount.toFixed(2));
                refundAmount = 0;
                return [3 /*break*/, 13];
            case 2:
                if (!(paymentMethod === client_1.PaymentMethod.CREDITCARD)) return [3 /*break*/, 12];
                if (creditsUsed > 0 && refundedAmount + refundAmount > chargedAmount) {
                    creditsRefund = parseFloat((refundedAmount + refundAmount - chargedAmount).toFixed(2));
                    refundAmount = parseFloat((refundAmount - creditsRefund).toFixed(2));
                    creditsRefunded += creditsRefund;
                }
                if (!(refundAmount > 0)) return [3 /*break*/, 11];
                return [4 /*yield*/, braintree_1.default.transaction.find(transactionId)];
            case 3:
                transaction = _a.sent();
                if (!['submitted_for_settlement', 'authorized'].includes(transaction.status)) return [3 /*break*/, 7];
                if (!(refundAmount == parseFloat(transaction.amount))) return [3 /*break*/, 5];
                return [4 /*yield*/, braintree_1.default.transaction.void(transactionId)];
            case 4:
                result = _a.sent();
                return [3 /*break*/, 6];
            case 5:
                logger_1.default.error("Cannot refund transaction ".concat(transactionId, " in ").concat(transaction.status, " state"));
                return [2 /*return*/, false];
            case 6: return [3 /*break*/, 10];
            case 7:
                if (!['settled', 'settling'].includes(transaction.status)) return [3 /*break*/, 9];
                return [4 /*yield*/, braintree_1.default.transaction.refund(transactionId, refundAmount.toString())];
            case 8:
                result = _a.sent();
                return [3 /*break*/, 10];
            case 9:
                if (transaction.status === 'voided') {
                    logger_1.default.info("Transaction already voided, ".concat(invoiceId));
                }
                else {
                    logger_1.default.error("Unknown transaction status ".concat(transaction.status));
                    return [2 /*return*/, false];
                }
                _a.label = 10;
            case 10:
                if (!(result === null || result === void 0 ? void 0 : result.success)) {
                    logger_1.default.error("Braintree refund failed for ".concat(invoiceId, ", amount ").concat(refundAmount, ", error: ").concat(JSON.stringify(result)));
                    return [2 /*return*/, false];
                }
                _a.label = 11;
            case 11: return [3 /*break*/, 13];
            case 12:
                if (paymentMethod !== client_1.PaymentMethod.BILLING) {
                    logger_1.default.error("Unknown payment method ".concat(paymentMethod, " for ").concat(invoiceId));
                    return [2 /*return*/, false];
                }
                _a.label = 13;
            case 13: return [4 /*yield*/, prisma_1.default.invoice.update({
                    where: { invoiceId: invoiceId },
                    data: {
                        refundAmount: parseFloat((refundedAmount + refundAmount).toFixed(2)),
                        creditsRefunded: parseFloat(creditsRefunded.toFixed(2)),
                    },
                })];
            case 14:
                _a.sent();
                _a.label = 15;
            case 15:
                logger_1.default.info("Refund ".concat(refundAmount, ", credits ").concat(creditsRefunded, " successful for transaction ").concat(transactionId, ", ").concat(invoiceId));
                return [2 /*return*/, true];
            case 16:
                error_4 = _a.sent();
                logger_1.default.error("Error processing refund: ".concat(error_4));
                return [2 /*return*/, false];
            case 17: return [2 /*return*/];
        }
    });
}); };
exports.processRefund = processRefund;
var getTeamSuperAdminEmailAndTeamName = function (teamId) { return __awaiter(void 0, void 0, void 0, function () {
    var team, superAdmin, err_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.team.findUnique({
                        where: {
                            id: teamId,
                        },
                    })];
            case 1:
                team = _a.sent();
                if (!team) {
                    logger_1.default.error("No team found with the given team ID ".concat(teamId));
                    return [2 /*return*/, false];
                }
                return [4 /*yield*/, prisma_1.default.user.findUnique({
                        where: {
                            id: team.owner,
                        },
                    })];
            case 2:
                superAdmin = _a.sent();
                return [2 /*return*/, {
                        teamName: team.name,
                        superAdminEmail: superAdmin === null || superAdmin === void 0 ? void 0 : superAdmin.email,
                        superAdminFirstName: superAdmin === null || superAdmin === void 0 ? void 0 : superAdmin.firstname,
                        superAdminFullName: "".concat(superAdmin === null || superAdmin === void 0 ? void 0 : superAdmin.firstname, " ").concat(superAdmin === null || superAdmin === void 0 ? void 0 : superAdmin.lastname),
                    }];
            case 3:
                err_9 = _a.sent();
                return [2 /*return*/, false];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getTeamSuperAdminEmailAndTeamName = getTeamSuperAdminEmailAndTeamName;
var isTranscriberICQC = function (transcriberId) { return __awaiter(void 0, void 0, void 0, function () {
    var transcriberDetail, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.default.verifier.findFirst({
                        where: {
                            userId: transcriberId,
                            qcType: client_1.QCType.CONTRACTOR,
                        },
                    })];
            case 1:
                transcriberDetail = _a.sent();
                if (!transcriberDetail) {
                    return [2 /*return*/, {
                            isICQC: false,
                            qcRate: 0,
                            cfRate: 0,
                            cfRRate: 0,
                        }];
                }
                return [2 /*return*/, {
                        isICQC: true,
                        qcRate: transcriberDetail.qcRate,
                        cfRate: transcriberDetail.cfRate,
                        cfRRate: transcriberDetail.cfRRate,
                    }];
            case 2:
                error_5 = _a.sent();
                logger_1.default.error("failed to check if transcriber is IC QC ".concat(transcriberId, ": ").concat(error_5));
                return [2 /*return*/, {
                        isICQC: false,
                        qcRate: 0,
                        cfRate: 0,
                        cfRRate: 0,
                    }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.isTranscriberICQC = isTranscriberICQC;
var getCustomerRate = function (userId) { return __awaiter(void 0, void 0, void 0, function () {
    var customerId, user, teamSuperAdminDetails, userRate, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                customerId = userId;
                return [4 /*yield*/, prisma_1.default.user.findUnique({
                        where: {
                            id: userId,
                        },
                    })];
            case 1:
                user = _a.sent();
                if (!user) {
                    logger_1.default.error("No user found for user ID ".concat(userId));
                    return [2 /*return*/, false];
                }
                if (!(user.role === client_1.Role.INTERNAL_TEAM_USER)) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, exports.getTeamAdminUserDetails)(userId)];
            case 2:
                teamSuperAdminDetails = _a.sent();
                if (!teamSuperAdminDetails) {
                    logger_1.default.error("No team super admin found for user ID ".concat(userId));
                    return [2 /*return*/, false];
                }
                customerId = teamSuperAdminDetails.userId;
                _a.label = 3;
            case 3: return [4 /*yield*/, prisma_1.default.userRate.findUnique({
                    where: {
                        userId: customerId,
                    },
                })];
            case 4:
                userRate = _a.sent();
                if (!userRate) {
                    logger_1.default.error("No rates found for user ID ".concat(userId));
                    return [2 /*return*/, false];
                }
                return [2 /*return*/, {
                        qcRate: userRate.customFormatQcRate,
                        reviewerLowDifficultyRate: userRate.customFormatReviewRate,
                        reviewerMediumDifficultyRate: userRate.customFormatMediumDifficultyReviewRate,
                        reviewerHighDifficultyRate: userRate.customFormatHighDifficultyReviewRate,
                        option: userRate.customFormatOption,
                    }];
            case 5:
                error_6 = _a.sent();
                logger_1.default.error('Failed to fetch user rates:', error_6);
                return [2 /*return*/, false];
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.getCustomerRate = getCustomerRate;
var checkExistingAssignment = function (transcriberId) { return __awaiter(void 0, void 0, void 0, function () {
    var existingAssignment, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_1.default.info("--> checkExistingAssignment ".concat(transcriberId));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.jobAssignment.findFirst({
                        where: {
                            transcriberId: transcriberId,
                            status: client_1.JobStatus.ACCEPTED,
                        },
                    })];
            case 2:
                existingAssignment = _a.sent();
                if (existingAssignment) {
                    return [2 /*return*/, true];
                }
                return [2 /*return*/, false];
            case 3:
                error_7 = _a.sent();
                logger_1.default.error("failed to get existing assignment for ".concat(transcriberId, ": ").concat(error_7));
                return [2 /*return*/, false];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.checkExistingAssignment = checkExistingAssignment;
var getWithdrawalsBonusesAndMiscEarnings = function (transcriberId) { return __awaiter(void 0, void 0, void 0, function () {
    var withdrawalSum, bonusSum, miscEarningsSum, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_1.default.info("--> getWithdrawalsBonusesAndMiscEarnings ".concat(transcriberId));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma_1.default.withdrawal.aggregate({
                        _sum: {
                            amount: true,
                        },
                        where: {
                            userId: transcriberId,
                        },
                    })];
            case 2:
                withdrawalSum = _a.sent();
                return [4 /*yield*/, prisma_1.default.bonus.aggregate({
                        _sum: {
                            amount: true,
                        },
                        where: {
                            userId: transcriberId,
                        },
                    })];
            case 3:
                bonusSum = _a.sent();
                return [4 /*yield*/, prisma_1.default.miscEarnings.aggregate({
                        _sum: {
                            amount: true,
                        },
                        where: {
                            userId: transcriberId,
                        },
                    })];
            case 4:
                miscEarningsSum = _a.sent();
                return [2 /*return*/, {
                        withdrawals: withdrawalSum._sum.amount || 0,
                        bonuses: bonusSum._sum.amount || 0,
                        miscEarnings: miscEarningsSum._sum.amount || 0,
                    }];
            case 5:
                error_8 = _a.sent();
                logger_1.default.error("failed to get withdrawals, bonuses and misc earnings for ".concat(transcriberId, ": ").concat(error_8));
                throw new Error();
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.getWithdrawalsBonusesAndMiscEarnings = getWithdrawalsBonusesAndMiscEarnings;
var getTranscriberCreditedHours = function (transcriberId) { return __awaiter(void 0, void 0, void 0, function () {
    var assignments, totalDuration, totalWorkedHours, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, prisma_1.default.jobAssignment.findMany({
                        where: {
                            transcriberId: transcriberId,
                            status: client_1.JobStatus.COMPLETED,
                        },
                        include: {
                            order: {
                                include: {
                                    File: true,
                                },
                            },
                        },
                    })];
            case 1:
                assignments = _a.sent();
                totalDuration = assignments.reduce(function (total, assignment) { var _a; return total + (((_a = assignment.order.File) === null || _a === void 0 ? void 0 : _a.duration) || 0); }, 0);
                totalWorkedHours = totalDuration / 3600;
                return [2 /*return*/, totalWorkedHours];
            case 2:
                error_9 = _a.sent();
                logger_1.default.error("failed to get credited hours for ".concat(transcriberId, ": ").concat(error_9));
                return [2 /*return*/, 0];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getTranscriberCreditedHours = getTranscriberCreditedHours;
var getTranscriberTodayCreditedHours = function (transcriberId) { return __awaiter(void 0, void 0, void 0, function () {
    var startOfDay, endOfDay, assignments, totalDuration, totalWorkedHours, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_1.default.info("--> getTranscriberTodayCreditedHours ".concat(transcriberId));
                startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                endOfDay = new Date();
                endOfDay.setHours(23, 59, 59, 999);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.jobAssignment.findMany({
                        where: {
                            transcriberId: transcriberId,
                            status: client_1.JobStatus.COMPLETED,
                            completedTs: {
                                gte: startOfDay,
                                lt: endOfDay,
                            },
                        },
                        include: {
                            order: {
                                include: {
                                    File: true,
                                },
                            },
                        },
                    })];
            case 2:
                assignments = _a.sent();
                totalDuration = assignments.reduce(function (total, assignment) { var _a; return total + (((_a = assignment.order.File) === null || _a === void 0 ? void 0 : _a.duration) || 0); }, 0);
                totalWorkedHours = totalDuration / 3600;
                return [2 /*return*/, totalWorkedHours];
            case 3:
                error_10 = _a.sent();
                logger_1.default.error("failed to get today credited hours for ".concat(transcriberId, ": ").concat(error_10));
                throw new Error();
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getTranscriberTodayCreditedHours = getTranscriberTodayCreditedHours;
var getAssignmentEarnings = function (transcriberId) { return __awaiter(void 0, void 0, void 0, function () {
    var earningsSum, earnings, error_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger_1.default.info("--> getAssignmentEarnings ".concat(transcriberId));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.default.jobAssignment.aggregate({
                        _sum: {
                            earnings: true,
                        },
                        where: {
                            transcriberId: transcriberId,
                            order: {
                                status: 'DELIVERED',
                            },
                        },
                    })];
            case 2:
                earningsSum = _a.sent();
                earnings = earningsSum._sum.earnings || 0;
                return [2 /*return*/, earnings];
            case 3:
                error_11 = _a.sent();
                logger_1.default.error("failed to get assignment earnings for ".concat(transcriberId, ": ").concat(error_11));
                throw new Error();
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getAssignmentEarnings = getAssignmentEarnings;
var processTranscriberPayment = function (invoiceIds) { return __awaiter(void 0, void 0, void 0, function () {
    var count, items, _i, invoiceIds_1, invoice, withdrawal, to_email, withdrawalAmount, fee, amount, to_paypal_id, status_1, requestBody, paypalPayout, response, error_12;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 7, , 8]);
                count = 0;
                items = [];
                _i = 0, invoiceIds_1 = invoiceIds;
                _d.label = 1;
            case 1:
                if (!(_i < invoiceIds_1.length)) return [3 /*break*/, 4];
                invoice = invoiceIds_1[_i];
                return [4 /*yield*/, prisma_1.default.withdrawal.findFirst({
                        where: { invoiceId: invoice },
                        include: { user: true },
                    })];
            case 2:
                withdrawal = _d.sent();
                if (!withdrawal) {
                    logger_1.default.warn("".concat(invoice, " not found in masspay, skipping"));
                    return [3 /*break*/, 3];
                }
                to_email = withdrawal.user.email;
                withdrawalAmount = (_a = withdrawal.amount) !== null && _a !== void 0 ? _a : 0;
                fee = (_b = withdrawal.fee) !== null && _b !== void 0 ? _b : 0;
                amount = parseFloat((withdrawalAmount - fee).toFixed(2));
                to_paypal_id = (_c = withdrawal.toPaypalId) !== null && _c !== void 0 ? _c : '';
                status_1 = withdrawal.status;
                if (status_1 !== client_1.WithdrawalStatus.INITIATED) {
                    logger_1.default.warn("".concat(invoice, " status is ").concat(status_1, " in masspay, skipping"));
                    return [3 /*break*/, 3];
                }
                items.push({
                    recipient_wallet: 'PAYPAL',
                    receiver: to_paypal_id,
                    amount: {
                        value: amount.toString(),
                        currency: 'USD',
                    },
                    note: "Withdrawal from ".concat(process.env.SERVER, " account of ").concat(to_email),
                    sender_item_id: invoice,
                });
                count++;
                _d.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4:
                if (!(count > 0)) return [3 /*break*/, 6];
                logger_1.default.info('Mass pay executed');
                requestBody = {
                    sender_batch_header: {
                        recipient_type: 'EMAIL',
                        email_message: "".concat(process.env.SERVER, " Withdrawal"),
                        note: "Withdrawal from ".concat(process.env.SERVER, " account"),
                        sender_batch_id: "batch_".concat(Date.now()),
                    },
                    items: items,
                };
                paypalPayout = new payouts_sdk_1.default.payouts.PayoutsPostRequest();
                paypalPayout.requestBody(requestBody);
                return [4 /*yield*/, paypal_1.default.execute(paypalPayout)];
            case 5:
                response = _d.sent();
                logger_1.default.info("Mass pay executed: ".concat(JSON.stringify(response.result)));
                _d.label = 6;
            case 6: return [2 /*return*/, true];
            case 7:
                error_12 = _d.sent();
                logger_1.default.error("mass pay failed: ".concat(error_12));
                return [2 /*return*/, false];
            case 8: return [2 /*return*/];
        }
    });
}); };
exports.processTranscriberPayment = processTranscriberPayment;
var checkTranscriberPayment = function (batchId) { return __awaiter(void 0, void 0, void 0, function () {
    var paypalPayout, response, result, error_13;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                paypalPayout = new payouts_sdk_1.default.payouts.PayoutsGetRequest(batchId);
                return [4 /*yield*/, paypal_1.default.execute(paypalPayout)];
            case 1:
                response = _a.sent();
                logger_1.default.info("Got status: ".concat(JSON.stringify(response.result)));
                result = response.result;
                return [2 /*return*/, result];
            case 2:
                error_13 = _a.sent();
                logger_1.default.error("failed to get status: ".concat(error_13));
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.checkTranscriberPayment = checkTranscriberPayment;
var bucketName = (_c = process.env.AWS_S3_BUCKET_NAME) !== null && _c !== void 0 ? _c : '';
function fileExistsInS3(key) {
    return __awaiter(this, void 0, void 0, function () {
        var command, error_14;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.default.info("Checking if file exists in S3: ".concat(key));
                    command = new client_s3_1.GetObjectCommand({
                        Bucket: bucketName,
                        Key: key,
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, s3Client.send(command)];
                case 2:
                    _a.sent();
                    logger_1.default.info("File exists in S3: ".concat(key));
                    return [2 /*return*/, true];
                case 3:
                    error_14 = _a.sent();
                    if (error_14 instanceof Error && error_14.name === 'NoSuchKey') {
                        logger_1.default.info("File does not exist in S3: ".concat(key));
                        return [2 /*return*/, false];
                    }
                    logger_1.default.error("Error checking if file exists in S3: ".concat(key, ", ").concat(String(error_14)));
                    throw error_14;
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.fileExistsInS3 = fileExistsInS3;
function uploadToS3(key_1, body_1) {
    return __awaiter(this, arguments, void 0, function (key, body, contentType) {
        var uploadParams, command, error_15;
        if (contentType === void 0) { contentType = 'text/plain'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    uploadParams = {
                        Bucket: bucketName,
                        Key: key,
                        Body: body,
                        ContentType: contentType,
                    };
                    logger_1.default.info("Uploading file to S3: ".concat(key));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    command = new client_s3_1.PutObjectCommand(uploadParams);
                    return [4 /*yield*/, s3Client.send(command)];
                case 2:
                    _a.sent();
                    logger_1.default.info("File uploaded successfully to S3: ".concat(key));
                    return [3 /*break*/, 4];
                case 3:
                    error_15 = _a.sent();
                    logger_1.default.error("Error uploading file to S3: ".concat(key, ", ").concat(String(error_15)));
                    throw error_15;
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.uploadToS3 = uploadToS3;
function downloadFromS3(key) {
    return __awaiter(this, void 0, void 0, function () {
        var downloadParams, command, response, Body_1, data, error_16;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    downloadParams = {
                        Bucket: bucketName,
                        Key: key,
                    };
                    logger_1.default.info("Downloading file from S3: ".concat(key));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    command = new client_s3_1.GetObjectCommand(downloadParams);
                    return [4 /*yield*/, s3Client.send(command)];
                case 2:
                    response = _a.sent();
                    Body_1 = response.Body;
                    if (!(Body_1 instanceof stream_1.Readable)) return [3 /*break*/, 4];
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            var chunks = [];
                            Body_1.on('data', function (chunk) { return chunks.push(chunk); });
                            Body_1.on('end', function () { return resolve(Buffer.concat(chunks)); });
                            Body_1.on('error', reject);
                        })];
                case 3:
                    data = _a.sent();
                    logger_1.default.info("File downloaded successfully from S3: ".concat(key));
                    return [2 /*return*/, data];
                case 4: throw new Error('Failed to download file: Invalid body stream');
                case 5:
                    error_16 = _a.sent();
                    logger_1.default.error("Error downloading file from S3: ".concat(key, ", ").concat(String(error_16)));
                    throw error_16;
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.downloadFromS3 = downloadFromS3;
function deleteFileVersionFromS3(key, versionId) {
    return __awaiter(this, void 0, void 0, function () {
        var deleteParams, command, error_17;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    deleteParams = {
                        Bucket: bucketName,
                        Key: key,
                        VersionId: versionId
                    };
                    logger_1.default.info("Deleting file version from S3: ".concat(key, ", version: ").concat(versionId));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    command = new client_s3_1.DeleteObjectCommand(deleteParams);
                    return [4 /*yield*/, s3Client.send(command)];
                case 2:
                    _a.sent();
                    logger_1.default.info("File version deleted successfully from S3: ".concat(key, ", version: ").concat(versionId));
                    return [2 /*return*/, true];
                case 3:
                    error_17 = _a.sent();
                    if (error_17 instanceof Error && error_17.name === 'NotFound') {
                        logger_1.default.warn("File version not found in S3: ".concat(key, ", version: ").concat(versionId));
                        return [2 /*return*/, false];
                    }
                    logger_1.default.error("Error deleting file version from S3: ".concat(key, ", version: ").concat(versionId, ", ").concat(String(error_17)));
                    throw error_17;
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.deleteFileVersionFromS3 = deleteFileVersionFromS3;
function getFileVersionFromS3(key, versionId) {
    return __awaiter(this, void 0, void 0, function () {
        var downloadParams, command, response, Body_2, data, error_18;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    downloadParams = {
                        Bucket: bucketName,
                        Key: key,
                        VersionId: versionId
                    };
                    logger_1.default.info("Downloading file version from S3: ".concat(key, ", version: ").concat(versionId));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    command = new client_s3_1.GetObjectCommand(downloadParams);
                    return [4 /*yield*/, s3Client.send(command)];
                case 2:
                    response = _a.sent();
                    Body_2 = response.Body;
                    if (!(Body_2 instanceof stream_1.Readable)) return [3 /*break*/, 4];
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            var chunks = [];
                            Body_2.on('data', function (chunk) { return chunks.push(chunk); });
                            Body_2.on('end', function () { return resolve(Buffer.concat(chunks)); });
                            Body_2.on('error', reject);
                        })];
                case 3:
                    data = _a.sent();
                    logger_1.default.info("File version downloaded successfully from S3: ".concat(key, ", version: ").concat(versionId));
                    return [2 /*return*/, data];
                case 4: throw new Error('Failed to download file version: Invalid body stream');
                case 5:
                    error_18 = _a.sent();
                    logger_1.default.error("Error downloading file version from S3: ".concat(key, ", version: ").concat(versionId, ", ").concat(String(error_18)));
                    throw error_18;
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.getFileVersionFromS3 = getFileVersionFromS3;
