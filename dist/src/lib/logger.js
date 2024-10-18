"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-unused-vars */
var path_1 = __importDefault(require("path"));
var winston_1 = __importStar(require("winston"));
var CUSTOM_LEVELS = {
    crit: 0,
    error: 1,
    warn: 2,
    info: 3,
};
// Custom format to include the caller file
var callerInfoFormat = (0, winston_1.format)(function (info) {
    var getCallerInfo = function () {
        var _a, _b;
        var originalFunc = Error.prepareStackTrace;
        try {
            var err = new Error();
            Error.prepareStackTrace = function (_, stack) { return stack; };
            var stack = err.stack;
            Error.prepareStackTrace = originalFunc;
            if (stack && stack.length > 9) {
                var allCallerInfo = [];
                // 10th item in the stack has the applciation code
                var caller = stack[10];
                var fileName = caller.getFileName();
                var relativePath = path_1.default.relative(process.cwd(), fileName !== null && fileName !== void 0 ? fileName : '-');
                var relativePathWithoutSrcDist = relativePath.replace('src\\', '');
                relativePathWithoutSrcDist = relativePathWithoutSrcDist.replace('dist\\', '');
                allCallerInfo.push(relativePathWithoutSrcDist);
                var functionName = (_a = caller.getFunctionName()) !== null && _a !== void 0 ? _a : '-';
                allCallerInfo.push(functionName);
                var lineNumber = (_b = caller.getLineNumber()) !== null && _b !== void 0 ? _b : '-';
                allCallerInfo.push(String(lineNumber));
                return allCallerInfo;
            }
        }
        catch (error) {
            return ['', '', ''];
        }
        finally {
            Error.prepareStackTrace = originalFunc;
        }
        return ['', '', ''];
    };
    var callerInfo = getCallerInfo();
    info.callerFile = callerInfo[0];
    info.callerFunction = callerInfo[1];
    info.callerLine = callerInfo[2];
    return info;
});
// <TIME_STAMP - 'YYYY-MM-DD HH:mm:ss'> <LEVEL> <FILE> <FUNCTION> <LINE> <MESSAGE>
// e.g. 2024-04-17 14:59:48 WARN testing logging
// Custom format to include the caller function and line number
var CUSTOM_FORMAT = winston_1.default.format.printf(function (_a) {
    var level = _a.level, message = _a.message, timestamp = _a.timestamp, callerFile = _a.callerFile, callerFunction = _a.callerFunction, callerLine = _a.callerLine;
    var formattedLevel = level.padEnd(5).slice(-5);
    var formattedCallerFile = callerFile === null || callerFile === void 0 ? void 0 : callerFile.padEnd(30).slice(-30);
    var formattedCallerFunction = callerFunction === null || callerFunction === void 0 ? void 0 : callerFunction.padEnd(20).slice(-20);
    var formattedCallerLine = callerLine === null || callerLine === void 0 ? void 0 : callerLine.toString().padStart(3, ' ');
    return "".concat(timestamp, " ").concat(formattedLevel.toUpperCase(), " ").concat(formattedCallerFile, " ").concat(formattedCallerLine, " : ").concat(message);
});
var TIME_STAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss';
var logger = winston_1.default.createLogger({
    levels: CUSTOM_LEVELS,
    format: winston_1.default.format.combine(callerInfoFormat(), winston_1.default.format.timestamp({ format: TIME_STAMP_FORMAT }), CUSTOM_FORMAT),
    transports: [new winston_1.default.transports.Console()],
});
exports.default = logger;
