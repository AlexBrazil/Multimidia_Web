/**
 * renderer.js
 * Módulo responsável por renderizar o conteúdo de um slide na DOM.
 * Ele transforma os objetos do data.json em elementos HTML.
 */

// Importa a função para abrir o modal, que está no main.js
import { abrirModal } from './main.js';

// Elementos da DOM onde o conteúdo será renderizado
const container = document.getElementById('slide-elements-container');
const titleEl = document.getElementById('slide-title');
const subtitleEl = document.getElementById('slide-subtitle');
const audioPlayer = document.getElementById('audio-player');

/**
 * Função principal que renderiza um slide completo.
 * @param {Object} slideObject - O objeto do slide vindo do JSON.
 */
export function renderSlide(slideObject) {
    console.log(`Renderizando slide: ID ${slideObject.id} - "${slideObject.title}"`);

    // 1. Limpa o conteúdo anterior
    container.innerHTML = '';
    
    // 2. Atualiza título e subtítulo
    titleEl.textContent = slideObject.title || '';
    subtitleEl.textContent = slideObject.subtitle || '';

    // 3. Atualiza o player de áudio
    if (slideObject.audio) {
        audioPlayer.src = `assets/audio/${slideObject.audio}`;
        audioPlayer.style.display = 'block';
    } else {
        audioPlayer.style.display = 'none';
        audioPlayer.src = '';
    }
    
    // 4. Percorre e renderiza cada elemento do slide
    if (slideObject.elements && slideObject.elements.length > 0) {
        slideObject.elements.forEach(element => {
            const htmlElement = criarElemento(element);
            if (htmlElement) {
                container.appendChild(htmlElement);
            }
        });
    }
}

/**
 * Função "roteadora" que decide qual função de renderização chamar
 * com base no tipo do elemento. Exportada para ser usada no modal.
 * @param {Object} elementObject - O objeto do elemento.
 * @returns {HTMLElement|null}
 */
export function criarElemento(elementObject) {
    // Adiciona uma verificação para garantir que o objeto existe
    if (!elementObject || !elementObject.type) {
        console.warn('Tentativa de renderizar um objeto de elemento inválido:', elementObject);
        return null;
    }

    switch (elementObject.type) {
        case 'TextElement':
            return criarTexto(elementObject);
        case 'ListElement':
            return criarLista(elementObject);
        case 'ImageElement':
            return criarImagem(elementObject);
        case 'VideoElement':
            return criarVideo(elementObject);
        case 'GridElement':
            return criarGrid(elementObject);
        case 'GroupElement':
            return criarGrupo(elementObject);
        case 'InfoBoxElement':
            return criarGatilhoInfoBox(elementObject);
        case 'SpacerElement':
            return criarEspacador(elementObject);
        case 'AppLauncherElement':
            return criarAppLauncher(elementObject);
        default:
            console.warn(`Tipo de elemento não suportado: ${elementObject.type}`);
            return null;
    }
}

// --- Funções Específicas de Renderização ---

function criarTexto(element) {
    const p = document.createElement('p');
    p.className = `text-element ${element.styleName || 'paragraph'}`;
    p.innerHTML = (element.text || '').replace(/\n/g, '<br>');
    return p;
}

function criarLista(element) {
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

function criarImagem(element) {
    if (element.source && element.source.toLowerCase().endsWith('.swf')) {
        const warning = document.createElement('div');
        warning.className = 'flash-warning';
        warning.textContent = `Conteúdo interativo obsoleto (Flash: ${element.source}).`;
        return warning;
    }

    const figure = document.createElement('figure');
    figure.className = 'image-element';

    const img = document.createElement('img');
    img.src = `assets/images/${element.source}`;
    img.alt = element.searchText || element.title || 'Imagem do curso';
    img.title = element.title || '';

    if (element.width > 0) img.style.width = `${element.width}px`;
    if (element.height > 0) img.style.height = `${element.height}px`;

    figure.appendChild(img);

    if (element.legend) {
        const figcaption = document.createElement('figcaption');
        figcaption.textContent = element.legend;
        figure.appendChild(figcaption);
    }
    return figure;
}

function extrairVideoIDdoYouTube(url) {
    if (!url) return null;
    let videoID = '';
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoID = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            videoID = urlObj.searchParams.get('v');
        }
    } catch (error) {
        console.error("URL de vídeo inválida:", url, error);
        return null;
    }
    return videoID;
}

function criarVideo(element) {
    const videoID = extrairVideoIDdoYouTube(element.video);
    if (!videoID) return null;

    const container = document.createElement('div');
    container.className = 'video-container-lazy';

    if (element.previewImage) {
        const previewImg = document.createElement('img');
        previewImg.src = `assets/images/${element.previewImage}`;
        previewImg.alt = element.title || 'Pré-visualização do vídeo';
        container.appendChild(previewImg);
    }
    
    const playButton = document.createElement('div');
    playButton.className = 'play-button-overlay';
    container.appendChild(playButton);

    container.addEventListener('click', () => {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoID}?autoplay=1`;
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        iframe.setAttribute('allowfullscreen', true);
        
        container.innerHTML = '';
        container.appendChild(iframe);
        container.classList.add('video-loaded');
    }, { once: true });

    return container;
}

function criarGrid(element) {
    const table = document.createElement('table');
    table.className = 'grid-element';
    
    const content = element.content || [];
    const isFirstRowHeader = element.isFirstRowHeader || false;

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

    const tbody = document.createElement('tbody');
    const startIndex = isFirstRowHeader ? 1 : 0;
    for (let i = startIndex; i < content.length; i++) {
        const row = document.createElement('tr');
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
    
    return table;
}

function criarGrupo(element) {
    const div = document.createElement('div');
    div.className = 'group-container';
    div.style.display = 'flex';
    div.style.flexDirection = element.mode === 'horizontalGroup' ? 'row' : 'column';
    
    const hAlignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
    const vAlignMap = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
    
    div.style.justifyContent = hAlignMap[element.horizontalAlign] || 'flex-start';
    div.style.alignItems = vAlignMap[element.verticalAlign] || 'flex-start';

    if (element.fillHeight) {
        div.style.flexGrow = '1';
    }
    
    if (element.elements) {
        element.elements.forEach(child => {
            const childEl = criarElemento(child);
            if (childEl) div.appendChild(childEl);
        });
    }

    return div;
}

function criarGatilhoInfoBox(element) {
    const button = document.createElement('button');
    button.className = 'infobox-trigger';
    button.innerHTML = 'i';
    button.title = `Info: ${element.title}`;
    
    button.style.position = 'absolute';
    button.style.left = `${element.x}px`;
    button.style.top = `${element.y}px`;

    button.addEventListener('click', () => {
        abrirModal(element);
    });
    
    return button;
}

function criarEspacador(element) {
    const spacer = document.createElement('span');
    spacer.className = 'spacer';
    spacer.style.width = `${element.width || 0}px`;
    spacer.style.height = `${element.height || 0}px`; // Adicionando suporte à altura
    return spacer;
}

function criarAppLauncher(element) {
    const link = document.createElement('a');
    link.className = 'app-launcher-button';
    link.href = element.path;
    link.textContent = 'Abrir Atividade Interativa';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
}