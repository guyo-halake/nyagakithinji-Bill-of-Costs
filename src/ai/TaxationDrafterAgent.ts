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
 * Agent 1: Compiles case facts & claim value into a 200+ row Schedule 6 Bill of Costs
 */
export class TaxationDrafterAgent {
  /**
   * Calculates statutory instruction fee under Schedule 6 Item 1(b)
   */
  static calculateStatutoryInstructionFee(claimValue: number, isDefended: boolean = true): number {
    if (claimValue <= 0) return 75000; // minimum statutory instruction fee
    let fee = 0;

    // Kenyan ARO Schedule 6 Item 1(b) calculation scale:
    // First KES 500,000 -> KES 75,000 (minimum)
    if (claimValue <= 500000) {
      fee = 75000;
    } else if (claimValue <= 1000000) {
      // Over 500k up to 1M -> 12% on the excess
      fee = 75000 + (claimValue - 500000) * 0.12;
    } else if (claimValue <= 5000000) {
      // Over 1M up to 5M -> KES 135k + 6% on excess
      fee = 135000 + (claimValue - 1000000) * 0.06;
    } else if (claimValue <= 20000000) {
      // Over 5M up to 20M -> KES 375k + 3% on excess
      fee = 375000 + (claimValue - 5000000) * 0.03;
    } else {
      // Over 20M -> KES 825k + 1.75% on excess
      fee = 825000 + (claimValue - 20000000) * 0.0175;
    }

    if (!isDefended) {
      fee = fee * 0.75; // undefended discount under ARO
    }

    return Math.round(fee * 100) / 100;
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
    const instructionFee = this.calculateStatutoryInstructionFee(params.claimValue, true);
    const gettingUpFee = this.calculateGettingUpFee(instructionFee);

    const items: StatutoryBillLineItem[] = [];
    let itemCounter = 1;

    // Item 1: Statutory Instruction Fee
    items.push({
      id: `aro-${itemCounter}`,
      itemNo: (itemCounter++).toString(),
      date: params.pleadings[0]?.date || '01.06.2023',
      particulars: `To receiving instructions to act on behalf of the Claimant to institute a dispute against the Respondent before ${params.forum} for KES ${params.claimValue.toLocaleString()} pursuant to Schedule 6 Item 1(b) of Advocates Remuneration Order`,
      statutoryItemCode: 'SCH6_ITEM_1B',
      amountClaimed: instructionFee,
      amountTaxedOff: 0,
      netAllowed: instructionFee,
      category: 'INSTRUCTION',
      statutoryNote: 'Statutory Instruction minimum based on subject value'
    });

    // Item 2: Getting Up Fee for trial
    items.push({
      id: `aro-${itemCounter}`,
      itemNo: (itemCounter++).toString(),
      date: params.pleadings[1]?.date || '15.07.2023',
      particulars: 'Getting up fees for trial (taking instructions, examining witnesses, trial preparation per Schedule 6 Item 2)',
      statutoryItemCode: 'SCH6_ITEM_2',
      amountClaimed: gettingUpFee,
      amountTaxedOff: 0,
      netAllowed: gettingUpFee,
      category: 'GETTING_UP',
      statutoryNote: 'One-third of statutory instruction fee'
    });

    // Item 3+: Pleadings, folios & attendances
    for (const p of params.pleadings) {
      if (p.folios > 0) {
        // Drawing: KES 150 first folio, KES 75 subsequent
        const drawingCost = 150 + Math.max(0, p.folios - 1) * 75;
        items.push({
          id: `aro-${itemCounter}`,
          itemNo: (itemCounter++).toString(),
          date: p.date,
          particulars: `To drawing ${p.particulars} (${p.folios} folios @ statutory rate)`,
          statutoryItemCode: 'SCH6_DRAWING',
          amountClaimed: drawingCost,
          amountTaxedOff: 0,
          netAllowed: drawingCost,
          category: 'DRAWING',
          statutoryNote: `${p.folios} folios statutory drawing charge`
        });

        // Engrossing & Filing
        const engrossingCost = p.folios * 35;
        items.push({
          id: `aro-${itemCounter}`,
          itemNo: (itemCounter++).toString(),
          date: p.date,
          particulars: `To engrossing and filing ${p.particulars} (3 copies before court)`,
          statutoryItemCode: 'SCH6_ENGROSSING',
          amountClaimed: engrossingCost,
          amountTaxedOff: 0,
          netAllowed: engrossingCost,
          category: 'DRAWING',
          statutoryNote: 'Statutory engrossing allowance'
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

    // Final item: Drawing and attending taxation
    items.push({
      id: `aro-${itemCounter}`,
      itemNo: (itemCounter++).toString(),
      date: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
      particulars: 'To drawing this Party & Party Bill of Costs and attending taxation before Taxing Master / Arbitrator',
      statutoryItemCode: 'SCH6_TAXATION',
      amountClaimed: 7500.00,
      amountTaxedOff: 0,
      netAllowed: 7500.00,
      category: 'DRAWING',
      statutoryNote: 'Taxation preparation and attendance'
    });

    const subtotal = items.reduce((acc, curr) => acc + curr.amountClaimed, 0);
    const vat = Math.round(subtotal * 0.16 * 100) / 100;
    const courtAssessment = Math.round(subtotal * 0.01 * 100) / 100;

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

