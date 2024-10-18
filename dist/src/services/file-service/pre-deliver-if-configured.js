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
var logger_1 = __importDefault(require("@/lib/logger"));
var prisma_1 = __importDefault(require("@/lib/prisma"));
var backend_helper_1 = require("@/utils/backend-helper");
function isPredeliveryEligible(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var teamAdminDetails, _a, customerId, customer;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    logger_1.default.info("--> isPredeliveryEligible: ".concat(userId));
                    if (!userId) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, backend_helper_1.getTeamAdminUserDetails)(Number(userId))];
                case 1:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = null;
                    _b.label = 3;
                case 3:
                    teamAdminDetails = _a;
                    logger_1.default.info("teamAdminDetails: ".concat(teamAdminDetails));
                    customerId = teamAdminDetails ? teamAdminDetails.userId : userId;
                    return [4 /*yield*/, prisma_1.default.customer.findUnique({
                            where: { userId: Number(customerId) },
                            select: { isPreDeliveryEligible: true },
                        })];
                case 4:
                    customer = _b.sent();
                    if (!customer) {
                        logger_1.default.error("Customer not found with userId ".concat(customerId));
                        return [2 /*return*/, false];
                    }
                    logger_1.default.info("--> isPredeliveryEligible: ".concat(customerId, " ").concat(customer.isPreDeliveryEligible));
                    return [2 /*return*/, customer.isPreDeliveryEligible];
            }
        });
    });
}
function preDeliverIfConfigured(order, transcriberId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.default.info("--> preDeliverIfConfigured ".concat(order.id, " ").concat(order.fileId));
                    return [4 /*yield*/, isPredeliveryEligible(String(order.userId))];
                case 1:
                    if (!((_a.sent()) == true)) return [3 /*break*/, 3];
                    logger_1.default.info('Order is marked for pre-delivery check');
                    return [4 /*yield*/, prisma_1.default.order.update({
                            where: { id: order.id },
                            data: {
                                deliveredTs: new Date(),
                                deliveredBy: transcriberId,
                                status: client_1.OrderStatus.PRE_DELIVERED,
                                updatedAt: new Date(),
                            },
                        })];
                case 2:
                    _a.sent();
                    logger_1.default.info("<-- preDeliverIfConfigured ".concat(order.id, " ").concat(order.fileId));
                    return [2 /*return*/, true];
                case 3:
                    logger_1.default.info("<-- preDeliverIfConfigured ".concat(order.id, " ").concat(order.fileId));
                    return [2 /*return*/, false];
            }
        });
    });
}
exports.default = preDeliverIfConfigured;
