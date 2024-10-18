import config from '../../config.json'
import faq from '../../static-content/faq.json'
import transcriberGuide from '../../static-content/transcriber-guide.json'
import emailIdsDev from '../configs/email-ids-dev.json'
import emailIds from '../configs/email-ids.json'
import emailPlaceholders from '../configs/email-placeholders.json'
import emailTemplates from '../configs/emails.json'

//signup Page
export const NAME_LENGTH = config.nameLength
export const MIN_PASSWORD_LENGTH = config.minPasswordLength
export const MAX_PASSWORD_LENGTH = config.maxPasswordLength
export const USER_TYPES = config.userTypes
export const INDUSTRIES = config.industries
export const DEFAULT_COUNTRY_CODE = config.defaultCountryCode
export const MAX_PHONE_NUMBER_LENGTH = config.maxPhoneNumberLength
export const MAX_DIAL_CODE_LENGTH = config.maxDialCodeLength
export const EMAIL_MAX_LENGTH = config.emailMaxLength
// files
export const FILE_TYPES = config.fileTypes
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL
export const FILE_CACHE_URL = process.env.NEXT_PUBLIC_FILE_CACHE_URL

export const RUSH_ORDER_PRICE = config.rush_order_price
export const STRICT_VERBATIUM_PRICE = config.strict_verbatium_price
export const BITC_PRICE = config.bitc_price
export const FREE_PRICE = config.free_price
export const IS_BUSINESS = false
export const NEXT_AUTH_SESSION_MAX_AGE = config.next_auth_session_max_age
export const HIGH_DIFF_THRESHOLD = config.high_diff_threshold
export const LOW_DIFF_THRESHOLD = config.low_diff_threshold
export const LOCALE = config.locale
export const MIN_CREDIT = config.min_credit
export const MAX_CREDIT = config.max_credit
export const FREE_WITHDRAWAL_AMOUNT = config.free_withdrawal_amount
export const CHARGE_ON_LOW_WITHDRAWAL_AMOUNT =
  config.charge_on_low_withdrawal_amount
export const HIGH_PWER = config.pwer.high
export const LOW_PWER = config.pwer.low
export const GENERAL_QC_TRANSCRIBER_RATE = config.transcriber_rates.general_qc
export const LEGAL_QC_TRANSCRIBER_RATE = config.transcriber_rates.legal_qc
export const SUPPORT_EMAIL = config.support
export const SCRIBIE_PHONE = config.phone_number
export const ORDER_CANCEL_PROGRESS = config.order_cancel_progress
export const CAPTCHA_EXCEPTION_LIST =
  process.env.NEXT_PUBLIC_CAPTCHA_EXCEPTION_LIST?.split(',') || []
export const INVOICE_ADDRESS = config.invoice_address
export const INVOICE_DISCLAIMER = config.invoice_disclaimer

//user settings
export const DEFAULT_USER_OPTIONS = config.default_user_options

//Static-Pages
export const StaticContent = { faq, transcriberGuide }
export const BASE_FARE = config.BASE_FARE
export const MINIMUM_AUDIO_PLAYBACK_PERCENTAGE =
  config.minimum_audio_playback_percentage
export const AUTOSAVE_INTERVAL = config.autosave_interval
export const ALLOWED_META = config.allowed_meta
export const DEFAULT_ORDER_OPTIONS = config.default_order_options
export const ORDER_TYPES = config.order_types
export const FILE_UPLOAD_LIMIT_IN_HOUR = config.file_upload_limit_in_hour
export const RATES = config.rates
export const VERBATIM_PRICE = config.verbatim_price
export const RUSH_PRICE = config.rush_price
export const AUDIO_TIMECODING_PRICE = config.audio_timecoding_price

// Email
export const EMAIL_IDS =
  process.env.SCB_ENVIRONMENT === 'STAGING' ? emailIdsDev : emailIds
export const EMAIL_PLACEHOLDERS = emailPlaceholders
export const EMAIL_TEMPLATES = emailTemplates

// Upload
export const SINGLE_PART_UPLOAD_LIMIT = config.single_part_upload_limit
export const MULTI_PART_UPLOAD_CHUNK_SIZE = config.multi_part_upload_chunk_size