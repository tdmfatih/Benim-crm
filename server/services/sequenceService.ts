import { query, transaction, isDatabaseConnected, fallbackStorage } from '../db/db';

export type SequenceType = 'offer' | 'service' | 'installation' | 'invoice';

const PREFIXES: Record<SequenceType, string> = {
  offer: 'TEK',
  service: 'SRV',
  installation: 'MNT',
  invoice: 'FAT',
};

export class SequenceService {
  /**
   * Thread-safe & concurrency-safe sequence generator.
   * Format: TEK-2026-000001
   */
  static async getNextNumber(type: SequenceType): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = PREFIXES[type];

    if (isDatabaseConnected()) {
      return await transaction(async (client) => {
        // Lock row FOR UPDATE to prevent race conditions under high concurrency
        const selectRes = await client.query(
          `SELECT current_year, last_number 
           FROM document_sequences 
           WHERE sequence_name = $1 
           FOR UPDATE`,
          [type]
        );

        let lastNum = 0;
        let seqYear = currentYear;

        if (selectRes.rows.length === 0) {
          await client.query(
            `INSERT INTO document_sequences (sequence_name, current_year, last_number) 
             VALUES ($1, $2, 1)`,
            [type, currentYear]
          );
          lastNum = 1;
        } else {
          const row = selectRes.rows[0];
          seqYear = row.current_year;
          lastNum = row.last_number;

          if (seqYear !== currentYear) {
            // New calendar year reset
            seqYear = currentYear;
            lastNum = 1;
          } else {
            lastNum += 1;
          }

          await client.query(
            `UPDATE document_sequences 
             SET current_year = $1, last_number = $2, updated_at = NOW() 
             WHERE sequence_name = $3`,
            [seqYear, lastNum, type]
          );
        }

        const paddedNumber = String(lastNum).padStart(6, '0');
        return `${prefix}-${seqYear}-${paddedNumber}`;
      });
    }

    // Fallback in-memory/file storage counter
    const store = fallbackStorage.get<Record<string, { year: number; last: number }>>('sequences', {
      offer: { year: currentYear, last: 1 },
      service: { year: currentYear, last: 1 },
      installation: { year: currentYear, last: 1 },
      invoice: { year: currentYear, last: 1 },
    });

    if (!store[type] || store[type].year !== currentYear) {
      store[type] = { year: currentYear, last: 1 };
    } else {
      store[type].last += 1;
    }

    fallbackStorage.save('sequences', store);
    const padded = String(store[type].last).padStart(6, '0');
    return `${prefix}-${currentYear}-${padded}`;
  }
}
