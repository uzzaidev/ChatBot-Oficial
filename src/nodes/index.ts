export { analyzeDocument } from "./analyzeDocument";
export { analyzeImage } from "./analyzeImage";
export { batchMessages } from "./batchMessages";
export { checkDuplicateMessage } from "./checkDuplicateMessage";
export type {
  CheckDuplicateMessageInput,
  CheckDuplicateMessageResult,
} from "./checkDuplicateMessage";
export { checkHumanHandoffStatus } from "./checkHumanHandoffStatus";
export type {
  CheckHumanHandoffInput,
  CheckHumanHandoffOutput,
} from "./checkHumanHandoffStatus";
export { checkOrCreateCustomer } from "./checkOrCreateCustomer";
export type { CheckOrCreateCustomerInput } from "./checkOrCreateCustomer";
export { downloadMetaMedia } from "./downloadMetaMedia";
export { filterStatusUpdates } from "./filterStatusUpdates";
export { formatResponse } from "./formatResponse";
export { generateAIResponse } from "./generateAIResponse";
export type { GenerateAIResponseInput } from "./generateAIResponse";
export { getChatHistory } from "./getChatHistory";
export { getRAGContext } from "./getRAGContext";
export { handleHumanHandoff } from "./handleHumanHandoff";
export type { HandleHumanHandoffInput } from "./handleHumanHandoff";
export { normalizeMessage } from "./normalizeMessage";
export type {
  NormalizeMessageInput,
  NormalizedMessage,
} from "./normalizeMessage";
export { parseMessage } from "./parseMessage";
export { pushToRedis } from "./pushToRedis";
export type { PushToRedisInput } from "./pushToRedis";
export { saveChatMessage } from "./saveChatMessage";
export { sendWhatsAppAudio } from "./sendWhatsAppAudio";
export type { SendWhatsAppAudioInput } from "./sendWhatsAppAudio";
export { sendWhatsAppDocument } from "./sendWhatsAppDocument";
export type { SendWhatsAppDocumentInput } from "./sendWhatsAppDocument";
export { sendWhatsAppImage } from "./sendWhatsAppImage";
export type { SendWhatsAppImageInput } from "./sendWhatsAppImage";
export { sendWhatsAppMessage } from "./sendWhatsAppMessage";
export type { SendWhatsAppMessageInput } from "./sendWhatsAppMessage";
export { transcribeAudio } from "./transcribeAudio";

// 🔧 Phase 1-3: Configuration-driven nodes
export { checkContinuity } from "./checkContinuity";
export type {
  CheckContinuityInput,
  CheckContinuityOutput,
} from "./checkContinuity";
export { classifyIntent } from "./classifyIntent";
export type {
  ClassifyIntentInput,
  ClassifyIntentOutput,
} from "./classifyIntent";
export { detectRepetition } from "./detectRepetition";
export type {
  DetectRepetitionInput,
  DetectRepetitionOutput,
} from "./detectRepetition";

// 🔧 RAG: Document processing with semantic chunking
export { handleDocumentSearchToolCall } from "./handleDocumentSearchToolCall";
export type {
  HandleDocumentSearchInput,
  HandleDocumentSearchOutput,
} from "./handleDocumentSearchToolCall";
export {
  deleteDocuments,
  listDocuments,
  processDocumentWithChunking,
} from "./processDocumentWithChunking";
export type {
  ProcessDocumentInput,
  ProcessDocumentOutput,
} from "./processDocumentWithChunking";
export { searchDocumentInKnowledge } from "./searchDocumentInKnowledge";
export type {
  DocumentSearchResult,
  SearchDocumentInput,
} from "./searchDocumentInKnowledge";

// 🚀 Fast Track Router: Cache-friendly FAQ detection
export { fastTrackRouter } from "./fastTrackRouter";
export type {
  FastTrackCatalogItem,
  FastTrackConfig,
  FastTrackRouterInput,
  FastTrackRouterOutput,
} from "./fastTrackRouter";

// 🎯 CRM Automation: Lead source capture and status updates
export { captureLeadSource } from "./captureLeadSource";
export type {
  CaptureLeadSourceInput,
  CaptureLeadSourceOutput,
  ReferralData,
} from "./captureLeadSource";
export { ensureCRMCard, updateCRMCardStatus } from "./updateCRMCardStatus";
export type {
  AutoStatus,
  CRMStatusEvent,
  UpdateCRMCardStatusInput,
  UpdateCRMCardStatusOutput,
} from "./updateCRMCardStatus";
