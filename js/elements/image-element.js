/**
 * image-element.js
 * Renderização de elementos de imagem com suporte a legenda e fallback Flash.
 */

import { atualizarAlturaDoContainer } from './base.js';

/**
 * Cria um elemento de imagem com suporte a legendas
 * @param {Object} element - Objeto ImageElement do data.json
 * @returns {HTMLElement}
 */
export function criarImagem(element) {
    // Fallback para arquivos Flash obsoletos
    if (element.source && element.source.toLowerCase().endsWith('.swf')) {
        const warning = document.createElement('div');
        warning.className = 'flash-warning';
        warning.textContent = `Conteúdo interativo obsoleto (Flash: ${element.source}).`;
        return warning;
    }

    // Estrutura figure + img + figcaption
    const figure = document.createElement('figure');
    figure.className = 'image-element';

    const img = document.createElement('img');
    img.src = `assets/images/${element.source}`;
    img.alt = element.searchText || element.title || 'Imagem do curso';
    img.title = element.title || '';

    // Dimensões específicas se definidas
    if (element.width > 0) img.style.width = `${element.width}px`;
    if (element.height > 0) img.style.height = `${element.height}px`;

    // Atualiza altura quando imagem carregar
    img.addEventListener('load', atualizarAlturaDoContainer, { once: true });

    figure.appendChild(img);

    // Legenda se presente
    if (element.legend) {
        const figcaption = document.createElement('figcaption');
        figcaption.textContent = element.legend;
        figure.appendChild(figcaption);
    }

    return figure;
}