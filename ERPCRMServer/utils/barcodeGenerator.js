/**
 * Barcode & QR Code Generator
 * Generates barcodes and QR codes as SVG or data URLs
 */

// Simple barcode generator (Code128-like)
const generateBarcodeSVG = (data, options = {}) => {
  const { width = 200, height = 80, fontSize = 12 } = options;
  const barWidth = 2;
  const bars = [];
  
  // Simple encoding: convert each character to binary pattern
  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
    for (let bit = 7; bit >= 0; bit--) {
      bars.push((code >> bit) & 1);
    }
  }
  
  let svgBars = '';
  let x = 10;
  for (const bar of bars) {
    if (bar) {
      svgBars += `<rect x="${x}" y="5" width="${barWidth}" height="${height - 20}" fill="black"/>`;
    }
    x += barWidth + 1;
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="white"/>
    ${svgBars}
    <text x="${width/2}" y="${height - 5}" text-anchor="middle" font-size="${fontSize}" font-family="monospace">${data}</text>
  </svg>`;
};

// Generate QR code SVG (simple grid-based representation)
const generateQRCodeSVG = (data, options = {}) => {
  const { size = 200, cellSize = 4 } = options;
  const cells = [];
  const gridSize = Math.floor(size / cellSize);
  
  // Generate deterministic pattern from data
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  
  // Create QR-like pattern with finder patterns
  const matrix = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
  
  // Add finder patterns (corners)
  const addFinderPattern = (startX, startY) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        if (y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4)) {
          if (startY + y < gridSize && startX + x < gridSize) {
            matrix[startY + y][startX + x] = true;
          }
        }
      }
    }
  };
  
  addFinderPattern(0, 0);
  addFinderPattern(gridSize - 7, 0);
  addFinderPattern(0, gridSize - 7);
  
  // Fill data area with deterministic pattern
  let seed = Math.abs(hash);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (!matrix[y][x]) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        matrix[y][x] = (seed % 3) === 0;
      }
    }
  }
  
  let svgCells = '';
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (matrix[y][x]) {
        svgCells += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      }
    }
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="white"/>
    ${svgCells}
  </svg>`;
};

// Generate barcode as base64 data URL
const generateBarcodeDataURL = (data, options = {}) => {
  const svg = generateBarcodeSVG(data, options);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

// Generate QR code as base64 data URL
const generateQRCodeDataURL = (data, options = {}) => {
  const svg = generateQRCodeSVG(data, options);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

// Generate unique product code
const generateProductCode = (prefix = 'PRD', id = 0) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const idStr = String(id).padStart(4, '0');
  return `${prefix}-${timestamp}-${idStr}`;
};

// Generate unique SKU
const generateSKU = (categoryCode = 'GEN', id = 0) => {
  return `${categoryCode}-${String(id).padStart(6, '0')}`;
};

module.exports = {
  generateBarcodeSVG,
  generateQRCodeSVG,
  generateBarcodeDataURL,
  generateQRCodeDataURL,
  generateProductCode,
  generateSKU
};