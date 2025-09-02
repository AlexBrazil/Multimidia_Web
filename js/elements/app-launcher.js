/**
 * app-launcher.js
 * Renderização de elementos para lançar aplicativos/jogos externos.
 */

import { atualizarAlturaDoContainer } from './base.js';

/**
 * Cria um botão/link para abrir atividades interativas
 * @param {Object} element - Objeto AppLauncherElement do data.json
 * @returns {HTMLAnchorElement}
 */
export function criarAppLauncher(element) {
    const link = document.createElement('a');
    link.className = 'app-launcher-button';
    link.href = element.path;
    link.textContent = 'Abrir Atividade Interativa';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    requestAnimationFrame(() => atualizarAlturaDoContainer());
    return link;
}