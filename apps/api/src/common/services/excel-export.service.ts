import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import type { Response } from 'express';

@Injectable()
export class ExcelExportService {
  /**
   * Export data to Excel and send as response
   */
  exportToExcel(
    data: Record<string, any>[],
    filename: string,
    sheetName: string,
    res: Response,
  ) {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.xlsx"`,
    );

    // Send buffer
    res.send(buffer);
  }
}
