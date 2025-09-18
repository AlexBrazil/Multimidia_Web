/**
 * grid-element.js
 * Renderização de elementos de tabela/grade com suporte a cores alternadas.
 */

import { atualizarAlturaDoContainer } from './base.js';

/**
 * Cria uma tabela baseada na configuração do JSON
 * @param {Object} element - Objeto GridElement do data.json
 * @returns {HTMLTableElement}
 */
export function criarGrid(element) {
    const table = document.createElement('table');
    table.className = 'grid-element';
    
    const content = element.content || [];
    const isFirstRowHeader = element.isFirstRowHeader || false;

    // Cabeçalho da tabela
    if (isFirstRowHeader && content.length > 0) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        content[0].forEach((cellText, colIndex) => {
            const th = document.createElement('th');
            th.textContent = (cellText || '').trim();
            
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
    const startIndex = isFirstRowHeader ? 1 : 0;
    
    for (let i = startIndex; i < content.length; i++) {
        const row = document.createElement('tr');
        
        // Cor alternada se configurado
        if (element.alternateRowColor && (i - startIndex) % 2 !== 0) {
            row.classList.add('alternate-row');
        }
        
        content[i].forEach((cellText, colIndex) => {
            const td = document.createElement('td');
            td.textContent = (cellText || '').trim();
            
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