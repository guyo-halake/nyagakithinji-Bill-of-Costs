export interface CauseListEntry {
  id: string;
  date: string;
  courtForum: string;
  presidingJudge: string;
  courtroom: string;
  caseNumber: string;
  parties: string;
  matterStage: 'MENTION' | 'DIRECTIONS' | 'RULING' | 'HEARING' | 'TAXATION';
  teamsMeetingLink?: string;
  timeSlot: string;
  advocateOnRecord: string;
  status: 'PENDING_TODAY' | 'COMPLETED' | 'ADJOURNED';
}

export interface WatchdogMatchResult {
  scanTimestamp: string;
  totalEntriesScanned: number;
  matchedMattersCount: number;
  matches: {
    caseNo: string;
    matterTitle: string;
    entry: CauseListEntry;
    urgency: 'HIGH' | 'NORMAL';
  }[];
  briefingText: string;
}

/**
 * Matches a published cause-list feed against matters supplied by the firm.
 */
export class CauseListWatchdogAgent {
  /**
   * Matches entries from a verified cause-list source against active matters.
   */
  static scanDailyCauseLists(
    activeFirmMatters: { caseNo: string; title: string; advocateAssigned: string }[],
    publishedLists: CauseListEntry[],
  ): WatchdogMatchResult {
    const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const matches: WatchdogMatchResult['matches'] = [];

    publishedLists.forEach(entry => {
      // Find matching matter in firm database
      const matchedMatter = activeFirmMatters.find(m => 
        m.caseNo.toLowerCase().replace(/\s/g, '').includes(entry.caseNumber.toLowerCase().replace(/\s/g, '')) ||
        entry.parties.toLowerCase().includes(m.title.toLowerCase().split('v')[0].trim())
      );

      if (matchedMatter) {
        matches.push({
          caseNo: matchedMatter.caseNo,
          matterTitle: matchedMatter.title,
          entry,
          urgency: entry.matterStage === 'RULING' || entry.matterStage === 'TAXATION' ? 'HIGH' : 'NORMAL'
        });
      }
    });

    const briefingText = `
DAILY CAUSE-LIST MATCHES — ${todayStr.toUpperCase()}
Matched ${matches.length} entries from the supplied published list:

${matches.map((m, idx) => `
${idx + 1}. *${m.entry.caseNumber}* — _${m.matterTitle}_
   🏛️ *Forum:* ${m.entry.courtForum}
   ⚖️ *Judge/Arbitrator:* ${m.entry.presidingJudge}
   ⏰ *Time:* ${m.entry.timeSlot} (${m.entry.courtroom})
   📌 *Stage:* ${m.entry.matterStage}
   ${m.entry.teamsMeetingLink ? `🔗 *Teams Link:* ${m.entry.teamsMeetingLink}` : '📍 Physical Court Attendance Required'}
`).join('\n')}

    `.trim();

    return {
      scanTimestamp: new Date().toISOString(),
      totalEntriesScanned: publishedLists.length,
      matchedMattersCount: matches.length,
      matches,
      briefingText
    };
  }
}
