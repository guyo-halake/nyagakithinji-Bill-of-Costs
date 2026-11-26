/**
 * Nyagah B. Kithinji & Co. Advocates — AI Legal Automation Engine
 * Master Configuration & Firm DNA
 * Multi-Agent System (Taxation, Auditor, Dispatcher, CauseList)
 */

export interface LegalAgentConfig {
  firmName: string;
  managingPartner: string;
  headquarters: string;
  practiceAreas: string[];
  testPhoneNumber: string; // The user specified: "dont send messaeg to theri whatsan numebr firts use ours"
  systemShortcode: string;
  wahaApiUrl: string;
  n8nWebhookUrl: string;
  geminiModel: string;
  statutoryBasis: {
    order: string;
    legalNotice: string;
    scales: Record<string, string>;
  };
}

export const NYAGAH_AI_CONFIG: LegalAgentConfig = {
  firmName: "Nyagah B. Kithinji & Co. Advocates",
  managingPartner: "Adv. Nyagah B. Kithinji",
  headquarters: "Upper Hill, Nairobi, Kenya",
  practiceAreas: [
    "Commercial & Construction Arbitration",
    "High Court Civil & Commercial Litigation",
    "Party & Party Bill of Costs Taxation",
    "Conveyancing & Land Securities",
    "Corporate Retainers & Legal Audits"
  ],
  // Test recipient as mandated: Use internal developer number before sending to real clients
  testPhoneNumber: "+254768141129", // Pochi la Biashara / Razak test dispatch line
  systemShortcode: "408221",
  wahaApiUrl: import.meta.env.VITE_WAHA_API_URL?.trim() || "http://localhost:5000/api/sendText",
  n8nWebhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL?.trim() || "",
  geminiModel: "gemini-2.5-flash",
  statutoryBasis: {
    order: "Advocates (Remuneration) Order 2014",
    legalNotice: "L.N. 35 of 2014 & L.N. 45 of 2014",
    scales: {
      schedule_6_instruction: "Schedule 6 Item 1(b) Defended High Court & Arbitration Claims",
      schedule_6_getting_up: "Schedule 6 Item 2 (One-third of instruction fee)",
      schedule_6_drawing: "KES 150 per folio (100 words) for drawing; KES 75 for engrossing",
      schedule_6_attendances: "KES 1,500 per hour or KES 2,500 substantive trial day",
      schedule_6_perusal: "KES 75 per folio for perusing opposing pleadings"
    }
  }
};
