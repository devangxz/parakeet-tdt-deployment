"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var payouts_sdk_1 = __importDefault(require("@paypal/payouts-sdk"));
var environment = function () {
    var clientId = process.env.PAYPAL_CLIENT_ID || 'PAYPAL-SANDBOX-CLIENT-ID';
    var clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'PAYPAL-SANDBOX-CLIENT-SECRET';
    if (process.env.SCB_ENVIRONMENT === 'PROD') {
        return new payouts_sdk_1.default.core.LiveEnvironment(clientId, clientSecret);
    }
    return new payouts_sdk_1.default.core.SandboxEnvironment(clientId, clientSecret);
};
var paypalClient = new payouts_sdk_1.default.core.PayPalHttpClient(environment());
exports.default = paypalClient;
