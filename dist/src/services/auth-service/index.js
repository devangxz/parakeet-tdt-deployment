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
exports.signInUser = void 0;
var bcrypt_1 = __importDefault(require("bcrypt"));
var jwt_1 = require("@/lib/jwt");
var prisma_1 = __importDefault(require("@/lib/prisma"));
function signInUser(userData) {
    return __awaiter(this, void 0, void 0, function () {
        var email, password, user, lastSelectedInternalTeamUserId, teamExists, userTeamRole, adminTeamMember, payload, token, payload, token, error_1;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        return __generator(this, function (_q) {
            switch (_q.label) {
                case 0:
                    email = userData.email, password = userData.password;
                    _q.label = 1;
                case 1:
                    _q.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, prisma_1.default.user.findUnique({
                            where: { email: email },
                            include: {
                                Customer: true,
                                UserRate: true,
                                Organization: true,
                                Verifier: true,
                            },
                        })];
                case 2:
                    user = _q.sent();
                    if (!user || !bcrypt_1.default.compareSync(password, user.pass)) {
                        return [2 /*return*/, {
                                success: false,
                                message: 'Invalid email or password',
                            }];
                    }
                    if (user.status === 'SUSPENDED') {
                        return [2 /*return*/, {
                                success: false,
                                message: 'Account suspended',
                            }];
                    }
                    lastSelectedInternalTeamUserId = (_a = user === null || user === void 0 ? void 0 : user.Customer) === null || _a === void 0 ? void 0 : _a.lastSelectedInternalTeamUserId;
                    if (!lastSelectedInternalTeamUserId) return [3 /*break*/, 6];
                    return [4 /*yield*/, prisma_1.default.teamMember.findFirst({
                            where: {
                                userId: parseInt(lastSelectedInternalTeamUserId),
                            },
                            include: {
                                team: true,
                            },
                        })];
                case 3:
                    teamExists = _q.sent();
                    if (!teamExists) {
                        console.error("Team not found ".concat(lastSelectedInternalTeamUserId));
                        return [2 /*return*/, { success: false, message: 'Team not found' }];
                    }
                    return [4 /*yield*/, prisma_1.default.teamMember.findFirst({
                            where: {
                                userId: user.id,
                                teamId: teamExists.teamId,
                            },
                        })];
                case 4:
                    userTeamRole = _q.sent();
                    return [4 /*yield*/, prisma_1.default.teamMember.findFirst({
                            where: {
                                teamId: teamExists.teamId,
                                role: 'SUPER_ADMIN',
                            },
                            include: {
                                user: {
                                    include: {
                                        UserRate: true,
                                        Customer: true,
                                        Organization: true,
                                    },
                                },
                            },
                        })];
                case 5:
                    adminTeamMember = _q.sent();
                    payload = {
                        name: "".concat(user.firstname, " ").concat(user.lastname),
                        user: user.user,
                        userId: user.id,
                        email: user.email,
                        role: user.role,
                        referralCode: user.referralCode,
                        status: user.status,
                        proAccount: ((_b = user === null || user === void 0 ? void 0 : user.Customer) === null || _b === void 0 ? void 0 : _b.proAccount) || 0,
                        customPlan: ((_d = (_c = adminTeamMember === null || adminTeamMember === void 0 ? void 0 : adminTeamMember.user) === null || _c === void 0 ? void 0 : _c.Customer) === null || _d === void 0 ? void 0 : _d.customPlan) || false,
                        internalTeamUserId: parseInt(lastSelectedInternalTeamUserId),
                        teamName: teamExists.team.name,
                        selectedUserTeamRole: userTeamRole === null || userTeamRole === void 0 ? void 0 : userTeamRole.role,
                        orderType: ((_e = adminTeamMember === null || adminTeamMember === void 0 ? void 0 : adminTeamMember.user.UserRate) === null || _e === void 0 ? void 0 : _e.orderType) || 'TRANSCRIPTION',
                        organizationName: ((_f = adminTeamMember === null || adminTeamMember === void 0 ? void 0 : adminTeamMember.user.Organization) === null || _f === void 0 ? void 0 : _f.name) || 'NONE',
                        legalEnabled: ((_g = user === null || user === void 0 ? void 0 : user.Verifier) === null || _g === void 0 ? void 0 : _g.legalEnabled) || false,
                        reviewEnabled: ((_h = user === null || user === void 0 ? void 0 : user.Verifier) === null || _h === void 0 ? void 0 : _h.cfReviewEnabled) || false,
                    };
                    token = (0, jwt_1.signJwtAccessToken)(payload);
                    return [2 /*return*/, {
                            success: true,
                            message: 'User signed in successfully',
                            user: payload,
                            token: token,
                        }];
                case 6:
                    payload = {
                        name: "".concat(user.firstname, " ").concat(user.lastname),
                        user: user.user,
                        userId: user.id,
                        email: user.email,
                        role: user.role,
                        referralCode: user.referralCode,
                        status: user.status,
                        proAccount: ((_j = user === null || user === void 0 ? void 0 : user.Customer) === null || _j === void 0 ? void 0 : _j.proAccount) || 0,
                        customPlan: ((_k = user === null || user === void 0 ? void 0 : user.Customer) === null || _k === void 0 ? void 0 : _k.customPlan) || false,
                        internalTeamUserId: null,
                        teamName: null,
                        selectedUserTeamRole: null,
                        orderType: ((_l = user.UserRate) === null || _l === void 0 ? void 0 : _l.orderType) || 'TRANSCRIPTION',
                        organizationName: ((_m = user.Organization) === null || _m === void 0 ? void 0 : _m.name) || 'NONE',
                        legalEnabled: ((_o = user === null || user === void 0 ? void 0 : user.Verifier) === null || _o === void 0 ? void 0 : _o.legalEnabled) || false,
                        reviewEnabled: ((_p = user === null || user === void 0 ? void 0 : user.Verifier) === null || _p === void 0 ? void 0 : _p.cfReviewEnabled) || false,
                    };
                    token = (0, jwt_1.signJwtAccessToken)(payload);
                    return [4 /*yield*/, prisma_1.default.user.update({
                            where: { id: user.id },
                            data: {
                                lastAccess: new Date(),
                            },
                        })];
                case 7:
                    _q.sent();
                    return [2 /*return*/, {
                            success: true,
                            message: 'User signed in successfully',
                            user: payload,
                            token: token,
                        }];
                case 8: return [3 /*break*/, 10];
                case 9:
                    error_1 = _q.sent();
                    console.error('Error during sign in:', error_1);
                    return [2 /*return*/, { success: false, message: 'Error during sign in' }];
                case 10: return [2 /*return*/];
            }
        });
    });
}
exports.signInUser = signInUser;
