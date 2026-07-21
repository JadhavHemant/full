/**
 * File Export Utility
 * Generates PDF (.pdf) and DOCX (.docx) files for reports and data export
 */
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle } = require('docx');

/**
 * Generate a PDF document for data export
 * @param {Object} options - { title, headers, rows, footer }
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePDF({ title, headers, rows, footer }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Title
      doc.fontSize(18).font('Helvetica-Bold').text(title || 'Export Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(9).font('Helvetica').fillColor('#666').text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
      doc.moveDown(1.5);

      // Draw line
      doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor('#4361ee').stroke();
      doc.moveDown(1);

      if (headers && headers.length > 0) {
        // Calculate column widths
        const pageWidth = 535;
        const colWidth = pageWidth / headers.length;

        // Table Header
        const headerTop = doc.y;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#fff');
        headers.forEach((header, i) => {
          const x = 30 + (i * colWidth);
          doc.rect(x, headerTop, colWidth, 18).fill('#4361ee');
          doc.fillColor('#fff').text(header, x + 3, headerTop + 4, { width: colWidth - 6, align: 'left' });
        });
        doc.fillColor('#333');
        doc.y = headerTop + 18;
      }

      // Table Rows
      if (rows && rows.length > 0) {
        const colWidth = 535 / headers.length;
        rows.forEach((row, rowIndex) => {
          // Check page break
          if (doc.y > 720) {
            doc.addPage();
            // Re-draw header on new page
            const headerTop = doc.y;
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#fff');
            headers.forEach((header, i) => {
              const x = 30 + (i * colWidth);
              doc.rect(x, headerTop, colWidth, 18).fill('#4361ee');
              doc.fillColor('#fff').text(header, x + 3, headerTop + 4, { width: colWidth - 6, align: 'left' });
            });
            doc.fillColor('#333');
            doc.y = headerTop + 18;
          }

          const rowTop = doc.y;
          const bgColor = rowIndex % 2 === 0 ? '#f8f9fa' : '#ffffff';
          doc.fontSize(7.5).font('Helvetica');

          // Determine max height needed for this row
          let maxLines = 1;
          row.forEach((cell, i) => {
            const text = String(cell || '');
            const charPerLine = Math.floor((colWidth - 6) / 4.5);
            const lines = Math.max(1, Math.ceil(text.length / charPerLine));
            maxLines = Math.max(maxLines, lines);
          });
          const rowHeight = Math.max(16, maxLines * 12);

          // Draw cell backgrounds
          row.forEach((cell, i) => {
            const x = 30 + (i * colWidth);
            doc.rect(x, rowTop, colWidth, rowHeight).fill(bgColor);
          });

          // Draw cell text
          row.forEach((cell, i) => {
            const x = 30 + (i * colWidth) + 3;
            doc.fillColor('#333').text(String(cell || ''), x, rowTop + 3, {
              width: colWidth - 6,
              align: 'left',
              lineBreak: true
            });
          });

          doc.y = rowTop + rowHeight;
        });
      }

      // Footer
      if (footer) {
        doc.moveDown(2);
        doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor('#ccc').stroke();
        doc.moveDown(0.5);
        doc.fontSize(8).fillColor('#999').text(footer, { align: 'center' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate a DOCX document for data export
 * @param {Object} options - { title, headers, rows, footer }
 * @returns {Promise<Buffer>} DOCX buffer
 */
async function generateDOCX({ title, headers, rows, footer }) {
  const children = [];

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: title || 'Export Report', bold: true, size: 28, color: '4361ee' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: `Generated: ${new Date().toISOString()}`, size: 18, color: '666666' })],
    })
  );

  if (headers && headers.length > 0) {
    // Header row
    const headerCells = headers.map((header) =>
      new TableCell({
        width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
        shading: { fill: '4361ee' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
            children: [new TextRun({ text: String(header), bold: true, size: 18, color: 'ffffff' })],
          }),
        ],
      })
    );

    const tableRows = [new TableRow({ children: headerCells })];

    // Data rows
    if (rows && rows.length > 0) {
      rows.forEach((row, idx) => {
        const cells = headers.map((_, colIdx) => {
          const val = row[colIdx] !== undefined ? String(row[colIdx]) : '';
          return new TableCell({
            width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
            shading: { fill: idx % 2 === 0 ? 'f8f9fa' : 'ffffff' },
            children: [
              new Paragraph({
                spacing: { before: 30, after: 30 },
                children: [new TextRun({ text: val, size: 16 })],
              }),
            ],
          });
        });
        tableRows.push(new TableRow({ children: cells }));
      });
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      })
    );
  }

  // Footer
  if (footer) {
    children.push(
      new Paragraph({ spacing: { before: 400 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: footer, size: 16, color: '999999' })],
      })
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Get content type and disposition for file download
 */
function getFileHeaders(filename, format) {
  const mimeTypes = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    csv: 'text/csv; charset=utf-8',
    json: 'application/json',
  };
  return {
    'Content-Type': mimeTypes[format] || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${filename}.${format}"`,
  };
}

module.exports = {
  generatePDF,
  generateDOCX,
  getFileHeaders,
};