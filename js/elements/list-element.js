/**
 * list-element.js
 * Renderização de elementos de lista (ordenadas e não-ordenadas).
 */

/**
 * Cria uma lista baseada na configuração do JSON
 * @param {Object} element - Objeto ListElement do data.json
 * @returns {HTMLUListElement|HTMLOListElement}
 */
export function criarLista(element) {
    const isOrdered = element.styleName === 'numberList';
    const listElement = document.createElement(isOrdered ? 'ol' : 'ul');
    listElement.className = `list-element ${element.styleName}`;

    if (isOrdered && element.startIndex > 1) {
        listElement.start = element.startIndex;
    }

    const items = (element.text || '').split('\n').filter(item => item.trim() !== '');
    items.forEach(itemText => {
        const li = document.createElement('li');
        li.textContent = itemText;
        listElement.appendChild(li);
    });

    return listElement;
}