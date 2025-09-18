/**
 * grid-element.js
 * Renderização de elementos de tabela/grade com suporte a cores alternadas
 * e (NOVO) aplicação de larguras proporcionais via `columnSizes`.
 */

import { atualizarAlturaDoContainer } from './base.js';

/* -------------------------------------------
   👇 NOVO: utilidades para lidar com colunas
-------------------------------------------- */

/**
 * Descobre o número de colunas do grid:
 * - prioriza element.columnNumber se for válido (>0),
 * - senão usa o maior comprimento entre as linhas do `content`,
 * - se tudo falhar, assume 1.
 */
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

/**
 * Normaliza `columnSizes` para a quantidade de colunas:
 * - aceita números (ex.: [2,2,1]) ou strings numéricas,
 * - se o array vier menor, completa com 1 (peso igual),
 * - se vier maior, corta,
 * - se todos zeros/NaN, cai no fallback "tudo 1",
 * - retorna um array de porcentagens que somam ~100.
 */
function computeColumnPercents(columnSizes, colCount) {
  const sizes = Array.from({ length: colCount }, (_, i) => {
    const v = columnSizes?.[i];
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) && n > 0 ? n : 1; // fallback 1
  });

  const total = sizes.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
  const safeTotal = total > 0 ? total : colCount; // evita div/0

  // Converte para porcentagens somando ~100%
  // (arredonda 2 casas para um output estável)
  const percents = sizes.map(n => Math.round(((n / safeTotal) * 100) * 100) / 100);
  // Ajuste fino: garantir que a soma não “estoure” por arredondamento
  const diff = 100 - percents.reduce((a, b) => a + b, 0);
  if (Math.abs(diff) >= 0.01) {
    // aplica correção mínima na última coluna
    percents[percents.length - 1] = Math.round((percents[percents.length - 1] + diff) * 100) / 100;
  }
  return percents;
}

/**
 * (NOVO) Cria um <colgroup> e aplica width % por coluna.
 * Por padrão, tabelas respeitam <col> com width em % quando
 * o CSS usa `table-layout: fixed; width: 100%` (recomendado no style.css).
 */
function applyColumnSizes(table, element, content) {
  const colCount = getColumnCount(element, content);
  const percents = computeColumnPercents(element?.columnSizes, colCount);

  // remove colgroup antigo (se houver re-render)
  const old = table.querySelector('colgroup');
  if (old) old.remove();

  const colgroup = document.createElement('colgroup');
  for (let i = 0; i < colCount; i++) {
    const col = document.createElement('col');
    col.style.width = `${percents[i]}%`; // largura proporcional
    colgroup.appendChild(col);
  }
  table.prepend(colgroup);

  // Dica: essas duas regras funcionam melhor com o <colgroup>:
  // (mantenha no seu style.css, não aqui)
  // .grid-element { table-layout: fixed; width: 100%; }
}

/* -------------------------------------------
   Renderização principal (mantida e ampliada)
-------------------------------------------- */

/**
 * Cria uma tabela baseada na configuração do JSON
 * @param {Object} element - Objeto GridElement do data.json
 * @returns {HTMLTableElement}
 */
export function criarGrid(element) {
  const table = document.createElement('table');
  table.className = 'grid-element';

  // Acessibilidade básica
  table.setAttribute('role', 'table');

  const content = Array.isArray(element.content) ? element.content : [];
  const isFirstRowHeader = !!element.isFirstRowHeader;

  /* -------------------------------------------
     (NOVO) Aplica colgroup com larguras em %
  -------------------------------------------- */
  applyColumnSizes(table, element, content); // 👈 NOVO

  // Cabeçalho da tabela (opcional)
  if (isFirstRowHeader && content.length > 0) {
    const thead = document.createElement('thead');
    thead.setAttribute('role', 'rowgroup');

    const headerRow = document.createElement('tr');
    headerRow.setAttribute('role', 'row');

    content[0].forEach((cellText, colIndex) => {
      const th = document.createElement('th');
      th.setAttribute('role', 'columnheader');
      th.textContent = (cellText ?? '').toString().trim();

      if (colIndex === element.featureColumn) {
        th.classList.add('feature-column');
      }
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);
  }

  // Corpo da tabela
  const tbody = document.createElement('tbody');
  tbody.setAttribute('role', 'rowgroup');
  const startIndex = isFirstRowHeader ? 1 : 0;

  for (let i = startIndex; i < content.length; i++) {
    const row = document.createElement('tr');
    row.setAttribute('role', 'row');

    // Cor alternada se configurado (mantido)
    if (element.alternateRowColor && (i - startIndex) % 2 !== 0) {
      row.classList.add('alternate-row');
    }

    const rowData = Array.isArray(content[i]) ? content[i] : [content[i]];

    rowData.forEach((cellText, colIndex) => {
      const td = document.createElement('td');
      td.setAttribute('role', 'cell');
      td.textContent = (cellText ?? '').toString().trim();

      if (colIndex === element.featureColumn) {
        td.classList.add('feature-column');
      }

      row.appendChild(td);
    });

    tbody.appendChild(row);
  }

  table.appendChild(tbody);

  // Atualiza altura após inserir o grid (mantido)
  requestAnimationFrame(() => atualizarAlturaDoContainer());

  return table;
}
