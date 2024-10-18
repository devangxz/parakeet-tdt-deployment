"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJwt = exports.signJwtAccessToken = void 0;
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var DEFAULT_SIGN_OPTION = {
    expiresIn: '48h',
};
function signJwtAccessToken(payload, options) {
    if (options === void 0) { options = DEFAULT_SIGN_OPTION; }
    var secret_key = process.env.JWT_SECRET_KEY;
    var token = jsonwebtoken_1.default.sign(payload, secret_key, options);
    return token;
}
exports.signJwtAccessToken = signJwtAccessToken;
function verifyJwt(token) {
    try {
        var secret_key = process.env.JWT_SECRET_KEY;
        var decoded = jsonwebtoken_1.default.verify(token, secret_key);
        return decoded;
    }
    catch (error) {
        return null;
    }
}
exports.verifyJwt = verifyJwt;
