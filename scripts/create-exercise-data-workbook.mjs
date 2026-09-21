import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';
import { EXERCISE_SEED } from '../server/schema.js';

const outputDir = fileURLToPath(new URL('../outputs/personalization-data/', import.meta.url));
const workbook = Workbook.create();
const sheet = workbook.worksheets.add('Exercise catalogue');
sheet.showGridLines = false;
sheet.freezePanes.freezeRows(4);

sheet.getRange('A1:N1').merge();
sheet.getRange('A1').values = [['BITS in Motion exercise catalogue']];
sheet.getRange('A2:N2').merge();
sheet.getRange('A2').values = [['Source of truth for plan selection, camera support, session storage, and the progress leaderboard.']];
sheet.getRange('A4:N4').values = [[
  'Exercise ID', 'Exercise', 'Category', 'Target', 'Instruction', 'Camera guided', 'Detector', 'MET',
  'Primary muscles', 'Secondary muscles', 'Goals', 'Minimum level', 'Equipment', 'Impact',
]];

const rows = EXERCISE_SEED.map((exercise) => [
  exercise[0], exercise[1], exercise[2], exercise[3], exercise[4], exercise[6] ? 'Yes' : 'No',
  exercise[7] || '—', exercise[8], exercise[9].join(', '), exercise[10].join(', '), exercise[11].join(', '),
  exercise[12], exercise[13], exercise[14],
]);
sheet.getRange(`A5:N${rows.length + 4}`).values = rows;
sheet.tables.add(`A4:N${rows.length + 4}`, true, 'ExerciseCatalogue');

sheet.getRange('A1:N1').format = { fill: '#153D37', font: { name: 'Arial', size: 16, bold: true, color: '#FFFFFF' }, verticalAlignment: 'center' };
sheet.getRange('A2:N2').format = { font: { name: 'Arial', size: 10, italic: true, color: '#465A56' }, verticalAlignment: 'center' };
sheet.getRange('A4:N4').format = { fill: '#246B5E', font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true };
sheet.getRange(`A5:N${rows.length + 4}`).format.font = { name: 'Arial', size: 10, color: '#182421' };
sheet.getRange(`H5:H${rows.length + 4}`).format.numberFormat = '0.0';
sheet.getRange(`F5:F${rows.length + 4}`).format.horizontalAlignment = 'center';
sheet.getRange(`G5:H${rows.length + 4}`).format.horizontalAlignment = 'center';
sheet.getRange(`L5:N${rows.length + 4}`).format.horizontalAlignment = 'center';
sheet.getRange(`A4:N${rows.length + 4}`).format.verticalAlignment = 'center';
sheet.getRange(`A5:N${rows.length + 4}`).format.wrapText = true;
sheet.getRange(`N5:N${rows.length + 4}`).conditionalFormats.add('containsText', { text: 'high', format: { fill: '#FDE8E7', font: { color: '#A61B1B', bold: true } } });
sheet.getRange(`N5:N${rows.length + 4}`).conditionalFormats.add('containsText', { text: 'low', format: { fill: '#E5F4EC', font: { color: '#17633C' } } });

const widths = [18, 25, 16, 15, 58, 15, 18, 9, 27, 27, 32, 16, 18, 12];
widths.forEach((width, index) => { sheet.getRangeByIndexes(0, index, rows.length + 4, 1).format.columnWidth = width; });
sheet.getRange('A1:N1').format.rowHeight = 28;
sheet.getRange('A2:N2').format.rowHeight = 22;
sheet.getRange('A4:N4').format.rowHeight = 30;
sheet.getRange(`A5:N${rows.length + 4}`).format.autofitRows();

workbook.recalculate();
await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}exercise-data.xlsx`);
const preview = await workbook.render({ sheetName: 'Exercise catalogue', range: `A1:N${rows.length + 4}`, scale: 1.2, format: 'png' });
await fs.writeFile(`${outputDir}exercise-data-preview.png`, new Uint8Array(await preview.arrayBuffer()));
