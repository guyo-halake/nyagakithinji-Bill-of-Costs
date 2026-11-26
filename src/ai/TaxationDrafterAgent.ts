import { calculate_schedule_6_high_court, ITEM_RATES, VAT_RATE } from '../engine/remuneration_engine';

export interface ExtractedLitigationPleading {
  date: string;
  documentType: string;
  particulars: string;
  folios: number;
  courtForum: string;
  attendancesCount?: number;
  durationHours?: number;
}

export interface StatutoryBillLineItem {
  id: string;
  itemNo: string;
  date: string;
  particulars: string;
  statutoryItemCode: string;
  amountClaimed: number;
  amountTaxedOff: number;
  netAllowed: number;
  category: 'INSTRUCTION' | 'GETTING_UP' | 'DRAWING' | 'PERUSAL' | 'ATTENDANCE' | 'DISBURSEMENT';
  statutoryNote: string;
}

export interface GeneratedBillOfCosts {
  matterId: string;
  matterTitle: string;
  caseNo: string;
  forum: string;
  claimAmount: number;
  statutoryInstructionFee: number;
  gettingUpFee: number;
  items: StatutoryBillLineItem[];
  subtotalProfessional: number;
  vat16: number;
  courtFilingFee1Percent: number;
  grandTotalClaimed: number;
  generatedAt: string;
}

/**
 * Builds a preliminary Schedule 6 draft from matter facts and entered activities.
 */
export class TaxationDrafterAgent {
  /**
   * Calculates statutory instruction fee under Schedule 6 Item 1(b)
   */
  static calculateStatutoryInstructionFee(claimValue: number, isDefended: boolean = true): number {
    return calculate_schedule_6_high_court(
      claimValue,
      isDefended ? 'full_trial' : 'undefended',
    ).instruction_fee;
  }

  /**
   * Calculates getting up fee (33.3% of statutory instruction fee)
   */
  static calculateGettingUpFee(instructionFee: number): number {
    return Math.round((instructionFee / 3) * 100) / 100;
  }

  /**
   * Compiles complete statutory Party & Party Bill of Costs from case record
   */
  static draftStatutoryBill(params: {
    matterId: string;
    matterTitle: string;
    caseNo: string;
    forum: string;
    claimValue: number;
    pleadings: ExtractedLitigationPleading[];
  }): GeneratedBillOfCosts {
    if (!Number.isFinite(params.claimValue) || params.claimValue <= 0) {
      throw new Error('A positive, verified claim value is required to prepare this draft.');
    }
    const instructionFee = this.calculateStatutoryInstructionFee(params.claimValue, true);
    const gettingUpFee = this.calculateGettingUpFee(instructionFee);

    const items: StatutoryBillLineItem[] = [];
    let itemCounter = 1;

    // Item 1: Statutory Instruction Fee
    items.push({
      id: `aro-${itemCounter}`,
      itemNo: (itemCounter++).toString(),
      date: params.pleadings[0]?.date || '',
      particulars: `To receiving instructions to act on behalf of the Claimant to institute a dispute against the Respondent before ${params.forum} for KES ${params.claimValue.toLocaleString()} pursuant to Schedule 6 Item 1(b) of Advocates Remuneration Order`,
      statutoryItemCode: 'SCH6_ITEM_1B',
      amountClaimed: instructionFee,
      amountTaxedOff: 0,
      netAllowed: instructionFee,
      category: 'INSTRUCTION',
      statutoryNote: 'Statutory Instruction minimum based on subject value'
    });

    const gettingUpActivity = params.pleadings.find(p => /\bgetting[\s-]?up\b|trial preparation/i.test(p.particulars));
    if (gettingUpActivity) {
      items.push({
        id: `aro-${itemCounter}`,
        itemNo: (itemCounter++).toString(),
        date: gettingUpActivity.date,
        particulars: gettingUpActivity.particulars,
        statutoryItemCode: 'SCH6_ITEM_2',
        amountClaimed: gettingUpFee,
        amountTaxedOff: 0,
        netAllowed: gettingUpFee,
        category: 'GETTING_UP',
        statutoryNote: 'Preliminary calculation; verify eligibility and amount.',
      });
    }

    for (const p of params.pleadings) {
      if (p.folios > 0) {
        const drawingCost = ITEM_RATES.drawing_pleading_base
          + Math.max(0, p.folios - 4) * ITEM_RATES.drawing_pleading_extra_folio;
        items.push({
          id: `aro-${itemCounter}`,
          itemNo: (itemCounter++).toString(),
          date: p.date,
          particulars: `To drawing ${p.particulars} (${p.folios} folios; verify folio count and applicable rate)`,
          statutoryItemCode: 'SCH6_DRAWING',
          amountClaimed: drawingCost,
          amountTaxedOff: 0,
          netAllowed: drawingCost,
          category: 'DRAWING',
          statutoryNote: `${p.folios} folios at the configured Schedule 6 drawing rate; verify before use.`
        });
      }

      if (p.attendancesCount && p.attendancesCount > 0) {
        const attendanceCost = p.attendancesCount * (p.durationHours ? p.durationHours * 1500 : 2500);
        items.push({
          id: `aro-${itemCounter}`,
          itemNo: (itemCounter++).toString(),
          date: p.date,
          particulars: `To attending ${params.forum} for ${p.particulars}`,
          statutoryItemCode: 'SCH6_ATTENDANCE',
          amountClaimed: attendanceCost,
          amountTaxedOff: 0,
          netAllowed: attendanceCost,
          category: 'ATTENDANCE',
          statutoryNote: 'Statutory counsel court appearance fee'
        });
      }
    }

    const subtotal = items.reduce((acc, curr) => acc + curr.amountClaimed, 0);
    const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
    const courtAssessment = 0;

    return {
      matterId: params.matterId,
      matterTitle: params.matterTitle,
      caseNo: params.caseNo,
      forum: params.forum,
      claimAmount: params.claimValue,
      statutoryInstructionFee: instructionFee,
      gettingUpFee: gettingUpFee,
      items: items,
      subtotalProfessional: subtotal,
      vat16: vat,
      courtFilingFee1Percent: courtAssessment,
      grandTotalClaimed: subtotal + vat + courtAssessment,
      generatedAt: new Date().toISOString()
    };
  }
}
