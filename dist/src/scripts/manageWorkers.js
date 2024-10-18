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
// TODO: Remove unnecessary logs
var axios_1 = __importDefault(require("axios"));
var bullmq_1 = require("bullmq");
var redis_1 = require("../lib/redis");
// import { TranscriptionService } from '../services/transcription.service';
var transcriptionQueue = new bullmq_1.Queue('transcription', { connection: redis_1.redis });
var RENDER_API_KEY = process.env.RENDER_API_KEY;
var RENDER_WORKER_SERVICE_ID = process.env.RENDER_WORKER_SERVICE_ID;
console.log("RENDER_WORKER_SERVICE_ID:", RENDER_WORKER_SERVICE_ID);
var RENDER_SERVICE_ID_HARDCODED = 'srv-croequg8fa8c738qs1pg';
var RENDER_API_URL = "https://api.render.com/v1/services/".concat(RENDER_SERVICE_ID_HARDCODED, "/scale");
function manageWorkers() {
    return __awaiter(this, void 0, void 0, function () {
        var jobCounts, totalJobs, currentInstancesResponse, currentInstances, desiredWorkers, response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, 7, 8]);
                    console.log("Running manageWorkers", redis_1.redis.options.host);
                    console.log("RENDER_API_URL:", RENDER_API_URL);
                    console.log("RENDER_WORKER_SERVICE_ID:", RENDER_WORKER_SERVICE_ID);
                    return [4 /*yield*/, transcriptionQueue.getJobCounts('waiting', 'active')];
                case 1:
                    jobCounts = _a.sent();
                    totalJobs = jobCounts.waiting + jobCounts.active;
                    console.log("Current queue status: ".concat(totalJobs, " total jobs (").concat(jobCounts.waiting, " waiting, ").concat(jobCounts.active, " active)"));
                    return [4 /*yield*/, axios_1.default.get("https://api.render.com/v1/services/".concat(RENDER_SERVICE_ID_HARDCODED), { headers: { 'Authorization': "Bearer ".concat(RENDER_API_KEY) } })];
                case 2:
                    currentInstancesResponse = _a.sent();
                    currentInstances = currentInstancesResponse.data.numInstances || 1;
                    desiredWorkers = Math.min(Math.max(Math.ceil(totalJobs / 2), 1), 5);
                    if (!(desiredWorkers !== currentInstances)) return [3 /*break*/, 4];
                    console.log("Scaling from ".concat(currentInstances, " to ").concat(desiredWorkers, " instances"));
                    return [4 /*yield*/, axios_1.default.post(RENDER_API_URL, { numInstances: desiredWorkers }, {
                            headers: {
                                'Authorization': "Bearer ".concat(RENDER_API_KEY),
                                'Content-Type': 'application/json'
                            }
                        })];
                case 3:
                    response = _a.sent();
                    console.log("Scaled service to ".concat(desiredWorkers, " instances. Render API response:"), response.data);
                    return [3 /*break*/, 5];
                case 4:
                    console.log("No scaling needed. Maintaining ".concat(currentInstances, " instances."));
                    _a.label = 5;
                case 5: return [3 /*break*/, 8];
                case 6:
                    error_1 = _a.sent();
                    console.error('Error managing workers:', error_1);
                    return [3 /*break*/, 8];
                case 7:
                    console.log("Finished manageWorkers");
                    process.exit(0);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    });
}
// Set a timeout to force exit if the job takes too long
var MAX_RUNTIME = 3 * 60 * 1000; // 3 minutes
setTimeout(function () {
    console.error("Job timed out after 3 minutes. Force exiting.");
    process.exit(1);
}, MAX_RUNTIME);
manageWorkers();
