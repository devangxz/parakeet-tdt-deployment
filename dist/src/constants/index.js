"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_PLACEHOLDERS = exports.EMAIL_IDS = exports.AUDIO_TIMECODING_PRICE = exports.RUSH_PRICE = exports.VERBATIM_PRICE = exports.RATES = exports.FILE_UPLOAD_LIMIT_IN_HOUR = exports.ORDER_TYPES = exports.DEFAULT_ORDER_OPTIONS = exports.ALLOWED_META = exports.AUTOSAVE_INTERVAL = exports.MINIMUM_AUDIO_PLAYBACK_PERCENTAGE = exports.BASE_FARE = exports.StaticContent = exports.DEFAULT_USER_OPTIONS = exports.INVOICE_DISCLAIMER = exports.INVOICE_ADDRESS = exports.CAPTCHA_EXCEPTION_LIST = exports.ORDER_CANCEL_PROGRESS = exports.SCRIBIE_PHONE = exports.SUPPORT_EMAIL = exports.LEGAL_QC_TRANSCRIBER_RATE = exports.GENERAL_QC_TRANSCRIBER_RATE = exports.LOW_PWER = exports.HIGH_PWER = exports.CHARGE_ON_LOW_WITHDRAWAL_AMOUNT = exports.FREE_WITHDRAWAL_AMOUNT = exports.MAX_CREDIT = exports.MIN_CREDIT = exports.LOCALE = exports.LOW_DIFF_THRESHOLD = exports.HIGH_DIFF_THRESHOLD = exports.NEXT_AUTH_SESSION_MAX_AGE = exports.IS_BUSINESS = exports.FREE_PRICE = exports.BITC_PRICE = exports.STRICT_VERBATIUM_PRICE = exports.RUSH_ORDER_PRICE = exports.FILE_CACHE_URL = exports.BACKEND_URL = exports.FILE_TYPES = exports.EMAIL_MAX_LENGTH = exports.MAX_DIAL_CODE_LENGTH = exports.MAX_PHONE_NUMBER_LENGTH = exports.DEFAULT_COUNTRY_CODE = exports.INDUSTRIES = exports.USER_TYPES = exports.MAX_PASSWORD_LENGTH = exports.MIN_PASSWORD_LENGTH = exports.NAME_LENGTH = void 0;
exports.MULTI_PART_UPLOAD_CHUNK_SIZE = exports.SINGLE_PART_UPLOAD_LIMIT = exports.EMAIL_TEMPLATES = void 0;
var config_json_1 = __importDefault(require("../../config.json"));
var faq_json_1 = __importDefault(require("../../static-content/faq.json"));
var transcriber_guide_json_1 = __importDefault(require("../../static-content/transcriber-guide.json"));
var email_ids_dev_json_1 = __importDefault(require("../configs/email-ids-dev.json"));
var email_ids_json_1 = __importDefault(require("../configs/email-ids.json"));
var email_placeholders_json_1 = __importDefault(require("../configs/email-placeholders.json"));
var emails_json_1 = __importDefault(require("../configs/emails.json"));
//signup Page
exports.NAME_LENGTH = config_json_1.default.nameLength;
exports.MIN_PASSWORD_LENGTH = config_json_1.default.minPasswordLength;
exports.MAX_PASSWORD_LENGTH = config_json_1.default.maxPasswordLength;
exports.USER_TYPES = config_json_1.default.userTypes;
exports.INDUSTRIES = config_json_1.default.industries;
exports.DEFAULT_COUNTRY_CODE = config_json_1.default.defaultCountryCode;
exports.MAX_PHONE_NUMBER_LENGTH = config_json_1.default.maxPhoneNumberLength;
exports.MAX_DIAL_CODE_LENGTH = config_json_1.default.maxDialCodeLength;
exports.EMAIL_MAX_LENGTH = config_json_1.default.emailMaxLength;
// files
exports.FILE_TYPES = config_json_1.default.fileTypes;
exports.BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
exports.FILE_CACHE_URL = process.env.NEXT_PUBLIC_FILE_CACHE_URL;
exports.RUSH_ORDER_PRICE = config_json_1.default.rush_order_price;
exports.STRICT_VERBATIUM_PRICE = config_json_1.default.strict_verbatium_price;
exports.BITC_PRICE = config_json_1.default.bitc_price;
exports.FREE_PRICE = config_json_1.default.free_price;
exports.IS_BUSINESS = false;
exports.NEXT_AUTH_SESSION_MAX_AGE = config_json_1.default.next_auth_session_max_age;
exports.HIGH_DIFF_THRESHOLD = config_json_1.default.high_diff_threshold;
exports.LOW_DIFF_THRESHOLD = config_json_1.default.low_diff_threshold;
exports.LOCALE = config_json_1.default.locale;
exports.MIN_CREDIT = config_json_1.default.min_credit;
exports.MAX_CREDIT = config_json_1.default.max_credit;
exports.FREE_WITHDRAWAL_AMOUNT = config_json_1.default.free_withdrawal_amount;
exports.CHARGE_ON_LOW_WITHDRAWAL_AMOUNT = config_json_1.default.charge_on_low_withdrawal_amount;
exports.HIGH_PWER = config_json_1.default.pwer.high;
exports.LOW_PWER = config_json_1.default.pwer.low;
exports.GENERAL_QC_TRANSCRIBER_RATE = config_json_1.default.transcriber_rates.general_qc;
exports.LEGAL_QC_TRANSCRIBER_RATE = config_json_1.default.transcriber_rates.legal_qc;
exports.SUPPORT_EMAIL = config_json_1.default.support;
exports.SCRIBIE_PHONE = config_json_1.default.phone_number;
exports.ORDER_CANCEL_PROGRESS = config_json_1.default.order_cancel_progress;
exports.CAPTCHA_EXCEPTION_LIST = ((_a = process.env.NEXT_PUBLIC_CAPTCHA_EXCEPTION_LIST) === null || _a === void 0 ? void 0 : _a.split(',')) || [];
exports.INVOICE_ADDRESS = config_json_1.default.invoice_address;
exports.INVOICE_DISCLAIMER = config_json_1.default.invoice_disclaimer;
//user settings
exports.DEFAULT_USER_OPTIONS = config_json_1.default.default_user_options;
//Static-Pages
exports.StaticContent = { faq: faq_json_1.default, transcriberGuide: transcriber_guide_json_1.default };
exports.BASE_FARE = config_json_1.default.BASE_FARE;
exports.MINIMUM_AUDIO_PLAYBACK_PERCENTAGE = config_json_1.default.minimum_audio_playback_percentage;
exports.AUTOSAVE_INTERVAL = config_json_1.default.autosave_interval;
exports.ALLOWED_META = config_json_1.default.allowed_meta;
exports.DEFAULT_ORDER_OPTIONS = config_json_1.default.default_order_options;
exports.ORDER_TYPES = config_json_1.default.order_types;
exports.FILE_UPLOAD_LIMIT_IN_HOUR = config_json_1.default.file_upload_limit_in_hour;
exports.RATES = config_json_1.default.rates;
exports.VERBATIM_PRICE = config_json_1.default.verbatim_price;
exports.RUSH_PRICE = config_json_1.default.rush_price;
exports.AUDIO_TIMECODING_PRICE = config_json_1.default.audio_timecoding_price;
// Email
exports.EMAIL_IDS = process.env.SCB_ENVIRONMENT === 'STAGING' ? email_ids_dev_json_1.default : email_ids_json_1.default;
exports.EMAIL_PLACEHOLDERS = email_placeholders_json_1.default;
exports.EMAIL_TEMPLATES = emails_json_1.default;
// Upload
exports.SINGLE_PART_UPLOAD_LIMIT = config_json_1.default.single_part_upload_limit;
exports.MULTI_PART_UPLOAD_CHUNK_SIZE = config_json_1.default.multi_part_upload_chunk_size;
