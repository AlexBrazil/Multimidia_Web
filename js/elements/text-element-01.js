/**
 * text-element.js
 * Renderização de elementos de texto (títulos, subtítulos, parágrafos).
 */

/**
 * Cria um elemento de texto baseado na configuração do JSON
 * @param {Object} element - Objeto TextElement do data.json
 * @returns {HTMLParagraphElement}
 */
export function criarTexto(element) {
    const p = document.createElement('p');
    p.className = `text-element ${element.styleName || 'paragraph'}`;
    p.innerHTML = (element.text || '').replace(/\n/g, '<br>');
    return p;
}