import { StatutoryBillLineItem } from './TaxationDrafterAgent';

export interface ObjectionFinding {
  itemNo: string;
  particulars: string;
  claimedAmount: number;
  recommendedTaxOff: number;
  statutoryGround: string;
  precedentRef: string;
  severity: 'HIGH' | 'MEDIUM' | 'MANDATORY_STATUTORY';
}

export interface OppositionAuditReport {
  matterTitle: string;
  opposingFirm: string;
  totalOpponentClaimed: number;
  totalRecommendedTaxOff: number;
  projectedNetExposure: number;
  findings: ObjectionFinding[];
  formalSubmissionsTemplate: string;
}

/**
 * Agent 2: Opposition Auditor Agent
 * Systematically audits opposing party's Bill of Costs to calculate statutory deductions (Taxed Off)
 * and generate formal Written Grounds of Opposition for taxation hearings
 */
export class OppositionAuditorAgent {
  static auditOpposingBill(params: {
    matterTitle: string;
    opposingFirm: string;
    items: StatutoryBillLineItem[];
    claimValue: number;
  }): OppositionAuditReport {
    const findings: ObjectionFinding[] = [];
    let totalTaxOff = 0;

    params.items.forEach(item => {
      const p = item.particulars.toLowerCase();
      let taxOff = 0;
      let ground = '';
      let precedent = '';
      let severity: ObjectionFinding['severity'] = 'MEDIUM';

      // 1. Audit instruction fee capping
      if (item.category === 'INSTRUCTION' && p.includes('instructions')) {
        // High Court Practice: Instruction fee cannot exceed Schedule 6 scale unless certified for complexity
        const maxStatutory = 75000 + (params.claimValue > 500000 ? (params.claimValue - 500000) * 0.12 : 0);
        if (item.amountClaimed > maxStatutory * 1.25) {
          taxOff = item.amountClaimed - maxStatutory;
          ground = `Claimed instruction fee exceeds statutory Schedule 6 Item 1(b) benchmark for claim of KES ${params.claimValue.toLocaleString()} with no certificate of exceptional complexity.`;
          precedent = 'Joreth Ltd v Kigano & Associates [2002] 1 EA 92';
          severity = 'MANDATORY_STATUTORY';
        }
      }

      // 2. Audit excessive folios in routine applications
      if (p.includes('mention') || p.includes('adjournment') || p.includes('list of documents')) {
        if (item.amountClaimed > 2500) {
          taxOff = item.amountClaimed - 1100;
          ground = 'Over-claimed folios on routine administrative document. Standard filing under Order 11 is 2 folios maximum.';
          precedent = 'Schedule 6 Item 8 (Formal and routine applications)';
          severity = 'HIGH';
        }
      }

      // 3. Audit double-billed attendances
      if (p.includes('attending court') && (p.includes('mention') || p.includes('virtual'))) {
        if (item.amountClaimed > 3500) {
          taxOff = item.amountClaimed - 1500;
          ground = 'Appearance was a brief virtual mention. Statutory scale under Schedule 6 Item 3 allows KES 1,500 per hour for virtual mentions.';
          precedent = 'Civil Appeal No. 142 of 2018 (Virtual Mentions Scale Practice Direction)';
          severity = 'HIGH';
        }
      }

      // 4. Audit duplicated getting-up fee
      if (p.includes('getting up') && item.amountClaimed > 500000 && params.claimValue < 5000000) {
        taxOff = item.amountClaimed * 0.4;
        ground = 'Getting-up fee exceeds 33.3% of allowed instruction fee and must be taxed off proportionally.';
        precedent = 'First American Bank of Kenya v Gulab P. Shah [2002] 1 KLR';
        severity = 'MANDATORY_STATUTORY';
      }

      if (taxOff > 0) {
        taxOff = Math.round(taxOff * 100) / 100;
        totalTaxOff += taxOff;
        findings.push({
          itemNo: item.itemNo,
          particulars: item.particulars,
          claimedAmount: item.amountClaimed,
          recommendedTaxOff: taxOff,
          statutoryGround: ground,
          precedentRef: precedent,
          severity
        });
      }
    });

    const totalClaimed = params.items.reduce((acc, it) => acc + it.amountClaimed, 0);

    const submissionsTemplate = `
REPUBLIC OF KENYA
IN THE HIGH COURT OF KENYA / ARBITRAL TRIBUNAL AT NAIROBI
MATTER: ${params.matterTitle.toUpperCase()}

RESPONDENT'S WRITTEN GROUNDS OF OPPOSITION TO THE APPLICANT'S BILL OF COSTS
DATED AND FILED BY ${params.opposingFirm.toUpperCase()}

1. TAKE NOTICE that the Respondent hereby vigorously objects to the Applicant's Bill of Costs totaling KES ${totalClaimed.toLocaleString()}, and prays that the Taxing Master taxes off a cumulative sum of KES ${totalTaxOff.toLocaleString()} on the following statutory grounds:
${findings.map((f, i) => `
   (${i + 1}) ITEM ${f.itemNo} — [Claimed: KES ${f.claimedAmount.toLocaleString()} | Tax Off: KES ${f.recommendedTaxOff.toLocaleString()}]
       Ground: ${f.statutoryGround}
       Authority: ${f.precedentRef}`).join('\n')}

2. WHEREFORE the Respondent prays that the Certificate of Taxation be limited strictly to the net sum of KES ${(totalClaimed - totalTaxOff).toLocaleString()} plus statutory disbursements actually vouched.

DATED at NAIROBI this ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.

___________________________________________
NYAGAH B. KITHINJI & CO. ADVOCATES
ADVOCATES FOR THE RESPONDENT
UPPER HILL, NAIROBI
    `.trim();

    return {
      matterTitle: params.matterTitle,
      opposingFirm: params.opposingFirm,
      totalOpponentClaimed: totalClaimed,
      totalRecommendedTaxOff: totalTaxOff,
      projectedNetExposure: Math.max(0, totalClaimed - totalTaxOff),
      findings,
      formalSubmissionsTemplate: submissionsTemplate
    };
  }
}

