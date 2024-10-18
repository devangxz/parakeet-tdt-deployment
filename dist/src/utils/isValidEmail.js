"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @param {string} email - The email address to validate
 * @returns {boolean} - Returns true if the email is valid, otherwise false
 */
var isValidEmail = function (email) {
    var emailRegex = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    return emailRegex.test(email);
};
exports.default = isValidEmail;
