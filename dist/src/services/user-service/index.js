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
exports.createUser = void 0;
var bcrypt_1 = __importDefault(require("bcrypt"));
var uuid_1 = require("uuid");
var prisma_1 = __importDefault(require("@/lib/prisma"));
var ses_1 = require("@/lib/ses");
var isValidEmail_1 = __importDefault(require("@/utils/isValidEmail"));
function createUser(userData) {
    return __awaiter(this, void 0, void 0, function () {
        var email, password, firstname, lastname, role, phone, industry, referralCode, inviteKey, existingUser, salt, hashedPassword, newUser, emailData, templateData, ses, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    email = userData.email, password = userData.password, firstname = userData.firstname, lastname = userData.lastname, role = userData.role, phone = userData.phone, industry = userData.industry;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, , 11]);
                    referralCode = (0, uuid_1.v4)();
                    inviteKey = (0, uuid_1.v4)();
                    if (!(0, isValidEmail_1.default)(email)) {
                        return [2 /*return*/, {
                                success: false,
                                message: 'Invalid email format',
                            }];
                    }
                    return [4 /*yield*/, prisma_1.default.user.findUnique({
                            where: { email: email },
                        })];
                case 2:
                    existingUser = _a.sent();
                    if (existingUser) {
                        return [2 /*return*/, { success: false, message: 'User with this email already exists' }];
                    }
                    return [4 /*yield*/, bcrypt_1.default.genSalt(10)];
                case 3:
                    salt = _a.sent();
                    return [4 /*yield*/, bcrypt_1.default.hash(password, salt)];
                case 4:
                    hashedPassword = _a.sent();
                    return [4 /*yield*/, prisma_1.default.user.create({
                            data: {
                                email: email,
                                pass: hashedPassword,
                                salt: salt,
                                firstname: firstname,
                                lastname: lastname,
                                role: role === 'customer' ? 'CUSTOMER' : 'TRANSCRIBER',
                                user: email,
                                referralCode: referralCode,
                                phoneNumber: phone,
                                industry: industry,
                            },
                        })];
                case 5:
                    newUser = _a.sent();
                    if (!(role === 'customer')) return [3 /*break*/, 7];
                    return [4 /*yield*/, prisma_1.default.customer.create({
                            data: {
                                userId: newUser.id,
                            },
                        })];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [4 /*yield*/, prisma_1.default.invite.create({
                        data: {
                            email: email,
                            inviteKey: inviteKey,
                        },
                    })
                    // TODO: Implement email sending functionality
                    // sendInviteEmail(email, inviteKey);
                ];
                case 8:
                    _a.sent();
                    emailData = {
                        userEmailId: email,
                    };
                    templateData = {
                        first_name: firstname,
                        url: "https://".concat(process.env.SERVER, "/verify-account/").concat(inviteKey),
                    };
                    ses = (0, ses_1.getAWSSesInstance)();
                    return [4 /*yield*/, ses.sendMail('ACCOUNT_VERIFY', emailData, templateData)];
                case 9:
                    _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            message: 'User created successfully',
                            user: newUser,
                        }];
                case 10:
                    error_1 = _a.sent();
                    console.error('Error creating user:', error_1);
                    return [2 /*return*/, { success: false, message: 'Failed to create user' }];
                case 11: return [2 /*return*/];
            }
        });
    });
}
exports.createUser = createUser;
