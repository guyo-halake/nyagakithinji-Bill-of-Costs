import { StatutoryBillLineItem } from './TaxationDrafterAgent';

export interface ObjectionFinding {
  itemNo: string;
  particulars: string;
  claimedAmount: number;
  observation: string;
}

export interface OppositionAuditReport {
  matterTitle: string;
  opposingFirm: string;
  totalOpponentClaimed: number;
  itemCount: number;
  findings: ObjectionFinding[];
}

export class OppositionAuditorAgent {
  static auditOpposingBill(params: {
    matterTitle: string;
    opposingFirm: string;
    items: StatutoryBillLineItem[];
  }): OppositionAuditReport {
    const findings: ObjectionFinding[] = [];
    const seenItems = new Map<string, StatutoryBillLineItem>();

    for (const item of params.items) {
      const description = item.particulars.trim().toLowerCase().replace(/\s+/g, ' ');
      const key = `${item.category}|${description}|${item.amountClaimed}`;
      const earlierItem = seenItems.get(key);
      if (earlierItem) {
        findings.push({
          itemNo: item.itemNo,
          particulars: item.particulars,
          claimedAmount: item.amountClaimed,
          observation: `This item matches item ${earlierItem.itemNo} in description, category, and amount. Check whether it is duplicated.`,
        });
      } else {
        seenItems.set(key, item);
      }
    }

    return {
      matterTitle: params.matterTitle,
      opposingFirm: params.opposingFirm,
      totalOpponentClaimed: params.items.reduce((total, item) => total + item.amountClaimed, 0),
      itemCount: params.items.length,
      findings,
    };
  }
}
