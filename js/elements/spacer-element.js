/**
 * spacer-element.js
 * Renderização de elementos de espaçamento para controle de layout.
 */

import { atualizarAlturaDoContainer } from './base.js';

/**
 * Cria um elemento espaçador para controle de layout
 * @param {Object} element - Objeto SpacerElement do data.json
 * @returns {HTMLSpanElement}
 */
export function criarEspacador(element) {
    const spacer = document.createElement('span');
    spacer.className = 'spacer';
    spacer.style.width = `${element.width || 0}px`;
    spacer.style.height = `${element.height || 0}px`;

    requestAnimationFrame(() => atualizarAlturaDoContainer());
    return spacer;
}