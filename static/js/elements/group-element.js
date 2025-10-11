/**
 * group-element.js
 * Renderização de containers de grupo usando Flexbox.
 */

import { atualizarAlturaDoContainer } from './base.js';

/**
 * Cria um container flexbox para agrupar outros elementos
 * @param {Object} element - Objeto GroupElement do data.json
 * @param {Function} criarElementoFn - Função factory para elementos filhos
 * @returns {HTMLDivElement}
 */
export function criarGrupo(element, criarElementoFn) {
    const div = document.createElement('div');
    div.className = 'group-container';
    div.style.display = 'flex';
    
    // Direção do flexbox
    div.style.flexDirection = element.mode === 'horizontalGroup' ? 'row' : 'column';
    
    // Mapeamento de alinhamentos
    const hAlignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
    const vAlignMap = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
    
    div.style.justifyContent = hAlignMap[element.horizontalAlign] || 'flex-start';
    div.style.alignItems = vAlignMap[element.verticalAlign] || 'flex-start';

    if (element.fillHeight) {
        div.style.flexGrow = '1';
    }
    
    // Renderiza elementos filhos recursivamente
    if (element.elements && criarElementoFn) {
        element.elements.forEach(child => {
            const childEl = criarElementoFn(child);
            if (childEl) div.appendChild(childEl);
        });
    }

    requestAnimationFrame(() => atualizarAlturaDoContainer());
    return div;
}