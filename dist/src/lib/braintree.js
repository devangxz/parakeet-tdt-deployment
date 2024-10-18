"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var braintree_1 = __importDefault(require("braintree"));
var gateway = new braintree_1.default.BraintreeGateway({
    environment: process.env.SCB_ENVIRONMENT === 'PROD'
        ? braintree_1.default.Environment.Production
        : braintree_1.default.Environment.Sandbox,
    merchantId: process.env.BRAINTREE_MERCHANT_ID,
    publicKey: process.env.BRAINTREE_PUBLIC_KEY,
    privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});
exports.default = gateway;
