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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAWSSesInstance = exports.sendTemplateMail = exports.deleteTemplate = exports.updateTemplate = exports.createTemplate = exports.sendAlert = exports.sendMail = void 0;
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var client_ses_1 = require("@aws-sdk/client-ses");
var logger_1 = __importDefault(require("./logger"));
var constants_1 = require("../constants");
var backend_helper_1 = require("../utils/backend-helper");
// Create SES client
var createSESClient = function () {
    return new client_ses_1.SESClient({
        region: process.env.AWS_SES_REGION,
        credentials: {
            accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
        },
    });
};
// Main function to send mail
function sendMail(ses_1, templateId_1) {
    return __awaiter(this, arguments, void 0, function (ses, templateId, emailData, templateData) {
        var emailDetails, emailDetailsUpdated;
        if (emailData === void 0) { emailData = { userEmailId: '' }; }
        if (templateData === void 0) { templateData = {}; }
        return __generator(this, function (_a) {
            logger_1.default.info("--> sendMail ".concat(templateId));
            try {
                emailDetails = __assign({}, constants_1.EMAIL_TEMPLATES[templateId]);
                emailDetailsUpdated = updateEmailIds(emailDetails, emailData);
                if (!emailDetailsUpdated) {
                    throw new Error("Mail configuration not found for mailId: ".concat(templateId));
                }
                if (emailDetailsUpdated.TEXT === '') {
                    return [2 /*return*/, sendMailHtml(ses, templateId, emailDetailsUpdated, templateData)];
                }
                else {
                    return [2 /*return*/, sendMailText(ses, emailDetailsUpdated, templateData)];
                }
            }
            catch (error) {
                logger_1.default.error("Error sending email: ".concat(error.message));
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
exports.sendMail = sendMail;
// Function to send alert
function sendAlert(ses_1, subject_1, message_1) {
    return __awaiter(this, arguments, void 0, function (ses, subject, message, type) {
        var templateId, emailDetails, emailData, emailParams, command, result, error_1;
        if (type === void 0) { type = 'software'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.default.info("--> sendAlert");
                    templateId = type === 'software' ? 'ALERT_SW_MAIL' : 'ALERT_FUNCTION_MAIL';
                    emailDetails = constants_1.EMAIL_TEMPLATES[templateId];
                    emailData = { userEmailId: '' };
                    emailDetails = updateEmailIds(emailDetails, emailData);
                    if (!emailDetails) {
                        throw new Error("Error: Mail configuration not found for alert");
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    emailParams = {
                        Source: emailDetails.FROM,
                        Destination: {
                            ToAddresses: emailDetails.TO,
                            CcAddresses: emailDetails.CC || [],
                            BccAddresses: emailDetails.BCC || [],
                        },
                        Message: {
                            Body: {
                                Text: {
                                    Data: message,
                                },
                            },
                            Subject: {
                                Data: "ALERT: ".concat(subject),
                            },
                        },
                    };
                    command = new client_ses_1.SendEmailCommand(emailParams);
                    return [4 /*yield*/, ses.send(command)];
                case 2:
                    result = _a.sent();
                    logger_1.default.info("<-- sendAlert ".concat(result.MessageId));
                    return [2 /*return*/, result];
                case 3:
                    error_1 = _a.sent();
                    logger_1.default.error("Error sending alert email: ".concat(error_1.message));
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.sendAlert = sendAlert;
// Function to send HTML mail
function sendMailHtml(ses_1, templateId_1, emailDetails_1) {
    return __awaiter(this, arguments, void 0, function (ses, templateId, emailDetails, templateData) {
        var templatesDir, templatePath, templateContent, emailParams, command, result, error_2;
        if (templateData === void 0) { templateData = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.default.info("--> sendMailHtml ".concat(templateId));
                    templatesDir = path_1.default.join(process.cwd(), 'src', 'mail-templates');
                    templatePath = path_1.default.join(templatesDir, "".concat(templateId, ".html"));
                    templateContent = fs_1.default.readFileSync(templatePath, 'utf8');
                    return [4 /*yield*/, updatePlaceHolders(templateContent, templateData)];
                case 1:
                    _a.sent();
                    emailParams = {
                        Source: emailDetails.FROM,
                        Destination: {
                            ToAddresses: emailDetails.TO,
                            CcAddresses: emailDetails.CC || [],
                            BccAddresses: emailDetails.BCC || [],
                        },
                        Template: templateId,
                        TemplateData: JSON.stringify(templateData),
                    };
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    command = new client_ses_1.SendTemplatedEmailCommand(emailParams);
                    return [4 /*yield*/, ses.send(command)];
                case 3:
                    result = _a.sent();
                    logger_1.default.info("<-- sendMailHtml ".concat(result.MessageId));
                    return [2 /*return*/, result];
                case 4:
                    error_2 = _a.sent();
                    logger_1.default.error("Error sending HTML email: ".concat(error_2.message));
                    throw error_2;
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Function to send text mail
function sendMailText(ses_1, emailDetails_1) {
    return __awaiter(this, arguments, void 0, function (ses, emailDetails, templateData) {
        var emailContent, placeholderKeys, emailParams, command, result, error_3;
        if (templateData === void 0) { templateData = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.default.info("--> sendMailText");
                    emailContent = emailDetails.TEXT;
                    return [4 /*yield*/, updatePlaceHolders(emailContent, templateData)];
                case 1:
                    placeholderKeys = _a.sent();
                    placeholderKeys.forEach(function (key) {
                        var cleanKey = key
                            .replace(/{{|\$\$|}}/g, '')
                            .trim();
                        if (templateData[cleanKey]) {
                            emailContent = emailContent.replace(key, templateData[cleanKey]);
                        }
                    });
                    emailParams = {
                        Source: emailDetails.FROM,
                        Destination: {
                            ToAddresses: emailDetails.TO,
                            CcAddresses: emailDetails.CC || [],
                            BccAddresses: emailDetails.BCC || [],
                        },
                        Message: {
                            Body: {
                                Text: {
                                    Data: emailContent,
                                },
                            },
                            Subject: {
                                Data: emailDetails.SUBJECT,
                            },
                        },
                    };
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    command = new client_ses_1.SendEmailCommand(emailParams);
                    return [4 /*yield*/, ses.send(command)];
                case 3:
                    result = _a.sent();
                    logger_1.default.info("<-- sendMailText ".concat(result.MessageId));
                    return [2 /*return*/, result];
                case 4:
                    error_3 = _a.sent();
                    logger_1.default.error("Error sending text email: ".concat(error_3.message));
                    throw error_3;
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Function to create email template
function createTemplate(ses, templateId) {
    return __awaiter(this, void 0, void 0, function () {
        var templatesDir, templatePath, htmlContent, strippedHtmlContent, emailDetails, params, command, error_4, errMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.default.info("--> createTemplate ".concat(templateId));
                    templatesDir = path_1.default.join(process.cwd(), 'src', 'mail-templates');
                    templatePath = path_1.default.join(templatesDir, "".concat(templateId, ".html"));
                    htmlContent = fs_1.default.readFileSync(templatePath, 'utf8');
                    strippedHtmlContent = htmlContent.replace(/<[^>]*>?/gm, '');
                    emailDetails = constants_1.EMAIL_TEMPLATES[templateId];
                    if (!emailDetails) {
                        throw new Error("Mail configuration not found for template: ".concat(templateId));
                    }
                    params = {
                        Template: {
                            TemplateName: templateId,
                            SubjectPart: emailDetails.SUBJECT,
                            HtmlPart: htmlContent,
                            TextPart: strippedHtmlContent,
                        },
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    command = new client_ses_1.CreateTemplateCommand(params);
                    return [4 /*yield*/, ses.send(command)];
                case 2:
                    _a.sent();
                    logger_1.default.info("<-- createTemplate ".concat(templateId));
                    return [2 /*return*/, "Email Template ".concat(templateId, " was created successfully")];
                case 3:
                    error_4 = _a.sent();
                    errMessage = "Error creating email template: ".concat(templateId, ": ").concat(error_4.toString());
                    logger_1.default.error(errMessage);
                    return [2 /*return*/, errMessage];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.createTemplate = createTemplate;
// Function to update email template
function updateTemplate(ses, templateId) {
    return __awaiter(this, void 0, void 0, function () {
        var templatesDir, templatePath, htmlContent, strippedHtmlContent, emailDetails, params, command, error_5, errMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.default.info("--> updateTemplate ".concat(templateId));
                    templatesDir = path_1.default.join(process.cwd(), 'src', 'mail-templates');
                    templatePath = path_1.default.join(templatesDir, "".concat(templateId, ".html"));
                    htmlContent = fs_1.default.readFileSync(templatePath, 'utf8');
                    strippedHtmlContent = htmlContent.replace(/<[^>]*>?/gm, '');
                    emailDetails = constants_1.EMAIL_TEMPLATES[templateId];
                    if (!emailDetails) {
                        throw new Error("Mail configuration not found for template: ".concat(templateId));
                    }
                    params = {
                        Template: {
                            TemplateName: templateId,
                            SubjectPart: emailDetails.SUBJECT,
                            HtmlPart: htmlContent,
                            TextPart: strippedHtmlContent,
                        },
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    command = new client_ses_1.UpdateTemplateCommand(params);
                    return [4 /*yield*/, ses.send(command)];
                case 2:
                    _a.sent();
                    logger_1.default.info("<-- updateTemplate ".concat(templateId));
                    return [2 /*return*/, "Email Template ".concat(templateId, " was updated successfully")];
                case 3:
                    error_5 = _a.sent();
                    errMessage = "Error updating email template: ".concat(templateId, ": ").concat(error_5.toString());
                    logger_1.default.error(errMessage);
                    return [2 /*return*/, errMessage];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.updateTemplate = updateTemplate;
// Function to delete email template
function deleteTemplate(ses, templateId) {
    return __awaiter(this, void 0, void 0, function () {
        var params, command, error_6, errMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.default.info("--> deleteTemplate ".concat(templateId));
                    params = {
                        TemplateName: templateId,
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    command = new client_ses_1.DeleteTemplateCommand(params);
                    return [4 /*yield*/, ses.send(command)];
                case 2:
                    _a.sent();
                    logger_1.default.info("<-- deleteTemplate ".concat(templateId));
                    return [2 /*return*/, "Email Template ".concat(templateId, " was deleted successfully")];
                case 3:
                    error_6 = _a.sent();
                    errMessage = "Error deleting email template: ".concat(templateId, ": ").concat(error_6.toString());
                    logger_1.default.error(errMessage);
                    return [2 /*return*/, errMessage];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.deleteTemplate = deleteTemplate;
// Helper function to update email IDs
function updateEmailIds(mailConfig, emailData) {
    logger_1.default.info("--> updateEmailIds ".concat(JSON.stringify(emailData)));
    var updatedConfig = __assign({}, mailConfig);
    if (updatedConfig.FROM in constants_1.EMAIL_IDS) {
        updatedConfig.FROM = constants_1.EMAIL_IDS[updatedConfig.FROM];
    }
    updatedConfig.TO = updatedConfig.TO.map(function (email) {
        if (email === '$$USER_EMAIL_ID$$' && emailData.userEmailId) {
            return emailData.userEmailId;
        }
        return email in constants_1.EMAIL_IDS
            ? constants_1.EMAIL_IDS[email]
            : email;
    });
    if (updatedConfig.CC) {
        updatedConfig.CC = updatedConfig.CC.map(function (email) {
            return email in constants_1.EMAIL_IDS ? constants_1.EMAIL_IDS[email] : email;
        });
    }
    if (updatedConfig.BCC) {
        updatedConfig.BCC = updatedConfig.BCC.map(function (email) {
            return email in constants_1.EMAIL_IDS ? constants_1.EMAIL_IDS[email] : email;
        });
    }
    logger_1.default.info('<-- updateEmailIds');
    return updatedConfig;
}
// Helper function to update placeholders
function updatePlaceHolders(content, templateData) {
    return __awaiter(this, void 0, void 0, function () {
        var placeholderKeys;
        return __generator(this, function (_a) {
            logger_1.default.info("--> updatePlaceHolders ".concat(JSON.stringify(templateData, null, 2)));
            placeholderKeys = content.match(/{{\$\$[\w\.]+\$\$}}/g) || [];
            placeholderKeys.forEach(function (key) {
                var cleanKey = key.replace(/{{|\$\$|}}/g, '').trim();
                cleanKey = "$$".concat(cleanKey, "$$");
                if (templateData[cleanKey] === undefined &&
                    cleanKey in constants_1.EMAIL_PLACEHOLDERS) {
                    templateData[cleanKey] =
                        constants_1.EMAIL_PLACEHOLDERS[cleanKey];
                }
            });
            logger_1.default.info("<-- updatePlaceHolders ".concat(JSON.stringify(templateData, null, 2)));
            return [2 /*return*/, placeholderKeys];
        });
    });
}
function sendTemplateMail(templateId_1, userId_1) {
    return __awaiter(this, arguments, void 0, function (templateId, userId, templateData, paidBy) {
        var getEmails, emailData, ses, error_7;
        if (templateData === void 0) { templateData = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, backend_helper_1.getEmailDetails)(userId, paidBy !== null && paidBy !== void 0 ? paidBy : 0)];
                case 1:
                    getEmails = _a.sent();
                    if (!getEmails) {
                        logger_1.default.error("Emails not found for user ".concat(userId));
                        return [2 /*return*/];
                    }
                    emailData = {
                        userEmailId: (getEmails === null || getEmails === void 0 ? void 0 : getEmails.email) || '',
                    };
                    ses = createSESClient();
                    return [4 /*yield*/, sendMail(ses, templateId, emailData, templateData)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_7 = _a.sent();
                    logger_1.default.error("Error in sendTemplateMail: ".concat(error_7.message));
                    return [2 /*return*/];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.sendTemplateMail = sendTemplateMail;
function getAWSSesInstance() {
    logger_1.default.info('getAWSSesInstance: Using real AWS SES');
    var ses = createSESClient();
    return {
        sendMail: function (templateId, emailData, templateData) { return sendMail(ses, templateId, emailData, templateData); },
        sendAlert: function (subject, message, type) {
            return sendAlert(ses, subject, message, type);
        },
        createTemplate: function (templateId) { return createTemplate(ses, templateId); },
        updateTemplate: function (templateId) { return updateTemplate(ses, templateId); },
        deleteTemplate: function (templateId) { return deleteTemplate(ses, templateId); },
    };
}
exports.getAWSSesInstance = getAWSSesInstance;
