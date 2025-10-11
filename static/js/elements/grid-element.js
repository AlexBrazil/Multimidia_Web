/**
 * grid-element.js
 * Renderização de elementos de tabela/grade com suporte a cores alternadas
 * e aplicação de larguras proporcionais via `columnSizes`.
 * (NOVO) Atribui data-attributes estáveis para ancoragem robusta:
 *   - data-row-index / data-col-index (0-based)
 *   - data-cell-id="r{row}c{col}"
 *   - data-row-key (slug da 1ª célula da linha no tbody)
 *   - data-col-key (slug do texto do th)
 *   - data-key (slug do texto da própria célula)
 */

import { atualizarAlturaDoContainer } from './base.js';

/* -------------------------------------------
   Utilidades
-------------------------------------------- */

// NEW: normalizador de texto para virar um "slug" estável
function slugify(input, maxLen = 40) {
  if (input == null) return '';
  const s = String(input)
    .normalize('NFD')                      // separa acentos
    .replace(/[\u0300-\u036f]/g, '')      // remove diacríticos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')                 // espaços -> hífen
    .replace(/[^a-z0-9-]/g, '-')          // remove chars estranhos
    .replace(/-+/g, '-');                 // colapsa múltiplos
  return s.slice(0, maxLen).replace(/^-+|-+$/g, '');
}

// NEW: define qtde de colunas (prioriza columnNumber; senão maior linha)
function getColumnCount(element, content) {
  if (Number.isFinite(element?.columnNumber) && element.columnNumber > 0) {
    return element.columnNumber;
  }
  let max = 0;
  for (const row of content || []) {
    if (Array.isArray(row)) max = Math.max(max, row.length);
  }
  return Math.max(1, max);
}

// NEW: converte columnSizes (pesos) em %
function computeColumnPercents(columnSizes, colCount) {
  const sizes = Array.from({ length: colCount }, (_, i) => {
    const v = columnSizes?.[i];
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) && n > 0 ? n : 1; // fallback 1
  });
  const total = sizes.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
  const safeTotal = total > 0 ? total : colCount;
  const percents = sizes.map(n => Math.round(((n / safeTotal) * 100) * 100) / 100);
  const diff = 100 - percents.reduce((a, b) => a + b, 0);
  if (Math.abs(diff) >= 0.01) {
    percents[percents.length - 1] = Math.round((percents[percents.length - 1] + diff) * 100) / 100;
  }
  return percents;
}

// NEW: cria <colgroup> com larguras em %
function applyColumnSizes(table, element, content) {
  const colCount = getColumnCount(element, content);
  const percents = computeColumnPercents(element?.columnSizes, colCount);

  const old = table.querySelector('colgroup');
  if (old) old.remove();

  const colgroup = document.createElement('colgroup');
  for (let i = 0; i < colCount; i++) {
    const col = document.createElement('col');
    col.style.width = `${percents[i]}%`;
    colgroup.appendChild(col);
  }
  table.prepend(colgroup);
  // obs: .grid-element { table-layout: fixed; width: 100%; } no CSS
}

/* -------------------------------------------
   Renderização principal
-------------------------------------------- */

/**
 * Cria uma tabela baseada na configuração do JSON
 * @param {Object} element - Objeto GridElement do data.json
 * @returns {HTMLTableElement}
 */
export function criarGrid(element) {
  const table = document.createElement('table');
  table.className = 'grid-element';
  table.setAttribute('role', 'table');

  const content = Array.isArray(element.content) ? element.content : [];
  const isFirstRowHeader = !!element.isFirstRowHeader;

  // aplica colgroup com larguras
  applyColumnSizes(table, element, content);

  // THEAD (opcional)
  let headerTexts = [];
  if (isFirstRowHeader && content.length > 0) {
    const thead = document.createElement('thead');
    thead.setAttribute('role', 'rowgroup');

    const headerRow = document.createElement('tr');
    headerRow.setAttribute('role', 'row');

    headerTexts = content[0].map(c => (c ?? '').toString().trim());

    headerTexts.forEach((cellText, colIndex) => {
      const th = document.createElement('th');
      th.setAttribute('role', 'columnheader');
      th.textContent = cellText;

      // NEW: data-col-index + data-col-key
      th.dataset.colIndex = String(colIndex);
      const colKey = slugify(cellText) || `col-${colIndex + 1}`;
      th.dataset.colKey = colKey;

      if (colIndex === element.featureColumn) {
        th.classList.add('feature-column');
      }

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);
  }

  // TBODY
  const tbody = document.createElement('tbody');
  tbody.setAttribute('role', 'rowgroup');
  const startIndex = isFirstRowHeader ? 1 : 0;

  for (let i = startIndex; i < content.length; i++) {
    const row = document.createElement('tr');
    row.setAttribute('role', 'row');

    // alternância de cor (mantido)
    if (element.alternateRowColor && (i - startIndex) % 2 !== 0) {
      row.classList.add('alternate-row');
    }

    const rowData = Array.isArray(content[i]) ? content[i] : [content[i]];

    // NEW: gera row-key a partir da 1ª célula da linha (se existir)
    const firstCellText = (rowData[0] ?? '').toString().trim();
    const rowKey = slugify(firstCellText) || `row-${i - startIndex + 1}`;
    row.dataset.rowIndex = String(i - startIndex); // 0-based no TBODY
    row.dataset.rowKey = rowKey;

    rowData.forEach((cellText, colIndex) => {
      const td = document.createElement('td');
      td.setAttribute('role', 'cell');
      const text = (cellText ?? '').toString().trim();
      td.textContent = text;

      // NEW: data attributes estáveis por célula
      td.dataset.rowIndex = String(i - startIndex);
      td.dataset.colIndex = String(colIndex);
      td.dataset.cellId   = `r${i - startIndex}c${colIndex}`;

      // NEW: data-key baseado no texto da própria célula
      const cellKey = slugify(text);
      if (cellKey) td.dataset.key = cellKey;

      if (colIndex === element.featureColumn) {
        td.classList.add('feature-column');
      }

      row.appendChild(td);
    });

    tbody.appendChild(row);
  }

  table.appendChild(tbody);

  requestAnimationFrame(() => atualizarAlturaDoContainer());
  return table;
}
