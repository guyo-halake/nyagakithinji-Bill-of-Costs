import {
  calculate_bill_of_costs,
  STATUTORY_SCHEDULES,
  ITEM_RATES,
  StatutoryScheduleDef,
  BillOfCostsResult
} from '../engine/remuneration_engine';

export interface BillCalculationRequest {
  claim_value: number;
  court_schedule: string;
  is_defendant: boolean;
  include_getting_up: boolean;
  items: Array<{ description: string; type: string; qty: number; unitRate?: number; unit_rate?: number }>;
  disbursements: number;
  apply_vat?: boolean;
  document_type?: string;
  custom_instruction_fee?: number | null;
  case_disposition?: string;
}

export interface BillCalculationResult {
  schedule: string;
  formula: string;
  claim_value: number;
  instruction_fee: number;
  getting_up_fee: number;
  items_total: number;
  taxable_subtotal: number;
  vat_amount: number;
  disbursements: number;
  grand_total: number;
  apply_vat?: boolean;
  document_type?: string;
  custom_instruction_fee?: number | null;
  case_disposition?: string;
  interest_14_percent?: number;
  grand_total_with_interest?: number;
  items?: any[];
}

export async function fetchStatutorySchedules(): Promise<StatutoryScheduleDef[]> {
  try {
    const res = await fetch('/api/v1/remuneration/schedules');
    if (res.ok) {
      const data = await res.json();
      if (data.schedules && data.schedules.length > 0) {
        return data.schedules;
      }
    }
  } catch (err) {
    // Offline mode: fallback to embedded statutory list
  }
  return STATUTORY_SCHEDULES;
}

export async function fetchStatutoryRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch('/api/v1/remuneration/rates');
    if (res.ok) {
      const data = await res.json();
      if (data.rates) {
        return data.rates;
      }
    }
  } catch (err) {
    // Offline mode: fallback
  }
  return ITEM_RATES;
}

export async function fetchStatutoryRules(): Promise<any> {
  try {
    const res = await fetch('/api/v1/remuneration/rules');
    if (res.ok) {
      const data = await res.json();
      return data.rules;
    }
  } catch (err) {
    // Offline mode: fallback
  }
  return null;
}

export async function calculateLegalBill(req: BillCalculationRequest): Promise<BillCalculationResult> {
  const applyVat = req.apply_vat !== false;
  const docType = req.document_type || 'party_party';
  const customInstr = req.custom_instruction_fee ?? null;
  const disposition = req.case_disposition || 'full_trial';

  try {
    const res = await fetch('/api/v1/remuneration/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim_value: req.claim_value,
        court_schedule: req.court_schedule,
        is_defendant: req.is_defendant,
        include_getting_up: req.include_getting_up,
        items: req.items,
        disbursements: req.disbursements,
        apply_vat: applyVat,
        document_type: docType,
        custom_instruction_fee: customInstr,
        case_disposition: disposition,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch (err) {
    // API offline fallback logic matching Advocates Remuneration Order rules
  }

  // Pure Offline Engine Fallback: Uses exact same statutory formulas
  const fallbackResult: BillOfCostsResult = calculate_bill_of_costs(
    req.claim_value,
    req.court_schedule,
    req.is_defendant,
    req.include_getting_up,
    req.items.map(it => ({
      description: it.description,
      type: it.type || 'drawing_pleading_base',
      qty: it.qty || 1,
      unit_rate: it.unitRate ?? it.unit_rate,
    })),
    req.disbursements,
    1.0,
    0,
    applyVat,
    docType,
    customInstr,
    disposition
  );

  return {
    schedule: fallbackResult.schedule,
    formula: fallbackResult.formula,
    claim_value: fallbackResult.claim_value,
    instruction_fee: fallbackResult.instruction_fee,
    getting_up_fee: fallbackResult.getting_up_fee,
    items_total: fallbackResult.items_total,
    taxable_subtotal: fallbackResult.taxable_subtotal,
    vat_amount: fallbackResult.vat_amount,
    disbursements: fallbackResult.disbursements,
    grand_total: fallbackResult.grand_total,
    apply_vat: applyVat,
    document_type: docType,
    custom_instruction_fee: customInstr,
    case_disposition: disposition,
    interest_14_percent: fallbackResult.interest_14_percent,
    grand_total_with_interest: fallbackResult.grand_total_with_interest,
    items: fallbackResult.items,
  };
}