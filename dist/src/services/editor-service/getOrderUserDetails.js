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
var logger_1 = __importDefault(require("@/lib/logger"));
var prisma_1 = __importDefault(require("@/lib/prisma"));
function getOrderUserDetails(orderId) {
    return __awaiter(this, void 0, void 0, function () {
        var resultJson, order, templateName, customInstructions, templateId, template, orgName, org, error_1;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    logger_1.default.info("--> getOrderUserDetails ".concat(orderId));
                    resultJson = {
                        order_id: 0,
                        order_type: '',
                        file_id: '',
                        file_name: '',
                        org_name: '',
                        template_name: '',
                        status: '',
                        instructions: '',
                        user_id: 0,
                    };
                    _l.label = 1;
                case 1:
                    _l.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, prisma_1.default.order.findUnique({
                            where: {
                                id: Number(orderId),
                            },
                            include: {
                                File: true,
                                user: true,
                            },
                        })];
                case 2:
                    order = _l.sent();
                    if (!order) {
                        logger_1.default.error("Order not found for ".concat(orderId));
                        throw new Error('Order not found');
                    }
                    templateName = '';
                    customInstructions = JSON.parse(((_a = order === null || order === void 0 ? void 0 : order.File) === null || _a === void 0 ? void 0 : _a.customInstructions) || '{}');
                    if (!(Object.keys(customInstructions).length !== 0)) return [3 /*break*/, 4];
                    templateId = customInstructions === null || customInstructions === void 0 ? void 0 : customInstructions.templateId;
                    return [4 /*yield*/, prisma_1.default.template.findUnique({
                            where: { id: Number(templateId) },
                            select: { name: true },
                        })];
                case 3:
                    template = _l.sent();
                    if (template) {
                        templateName = template.name;
                    }
                    else {
                        logger_1.default.info('Template not found for the provided template ID.');
                    }
                    _l.label = 4;
                case 4:
                    orgName = '';
                    return [4 /*yield*/, prisma_1.default.organization.findUnique({
                            where: {
                                userId: order === null || order === void 0 ? void 0 : order.userId,
                            },
                            select: {
                                name: true,
                            },
                        })];
                case 5:
                    org = _l.sent();
                    if (org) {
                        orgName = org.name;
                    }
                    else {
                        logger_1.default.info("'No organization name'}");
                    }
                    logger_1.default.info("".concat(order === null || order === void 0 ? void 0 : order.orderType, " ").concat(order === null || order === void 0 ? void 0 : order.userId, " ").concat(orgName));
                    logger_1.default.info("".concat(order === null || order === void 0 ? void 0 : order.fileId, " ").concat((_b = order === null || order === void 0 ? void 0 : order.File) === null || _b === void 0 ? void 0 : _b.filename, " ").concat(templateName, " ").concat(order === null || order === void 0 ? void 0 : order.user.email));
                    resultJson = {
                        order_id: (_c = order === null || order === void 0 ? void 0 : order.id) !== null && _c !== void 0 ? _c : 0,
                        order_type: (_d = order === null || order === void 0 ? void 0 : order.orderType) !== null && _d !== void 0 ? _d : '',
                        file_id: (_e = order === null || order === void 0 ? void 0 : order.fileId) !== null && _e !== void 0 ? _e : '',
                        file_name: (_g = (_f = order === null || order === void 0 ? void 0 : order.File) === null || _f === void 0 ? void 0 : _f.filename) !== null && _g !== void 0 ? _g : '',
                        org_name: orgName.toLowerCase(),
                        template_name: templateName,
                        status: (_h = order === null || order === void 0 ? void 0 : order.status) !== null && _h !== void 0 ? _h : '',
                        instructions: (_j = order === null || order === void 0 ? void 0 : order.instructions) !== null && _j !== void 0 ? _j : '',
                        user_id: (_k = order === null || order === void 0 ? void 0 : order.userId) !== null && _k !== void 0 ? _k : 0,
                    };
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _l.sent();
                    logger_1.default.error('Details could not be fetched');
                    return [3 /*break*/, 7];
                case 7:
                    logger_1.default.info("<-- getOrderUserDetails ".concat(orderId));
                    return [2 /*return*/, resultJson];
            }
        });
    });
}
exports.default = getOrderUserDetails;
