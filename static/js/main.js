/**
 * main.js
 * Orquestrador principal da aplicação.
 * Responsável por:
 * - Carregar os dados do curso.
 * - Construir a navegação interativa e responsiva.
 * - Gerenciar o estado (slide atual).
 * - Controlar os eventos de navegação e do modal.
 */

import { renderSlide, criarElemento } from './renderer.js';

// --- ELEMENTOS DA DOM ---
const menuContainer = document.getElementById('menu-items');
const btnAnterior = document.getElementById('btn-anterior');
const btnProximo = document.getElementById('btn-proximo');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalCloseBtn = document.getElementById('modal-close-btn');
const hamburgerBtn = document.getElementById('hamburger-btn');
const menuNav = document.getElementById('menu-navegacao');
const menuOverlay = document.getElementById('menu-overlay');
const toolsButton = document.getElementById('tools-button');
const toolsOverlay = document.getElementById('tools-overlay');
const toolsCloseBtn = document.getElementById('tools-close-btn');
const searchInput = document.getElementById('search-input');
const searchExactCheckbox = document.getElementById('search-exact');
const searchButton = document.getElementById('search-button');
const searchResultsOverlay = document.getElementById('search-results-overlay');
const searchResultsList = document.getElementById('search-results-list');
const searchResultsTitle = document.getElementById('search-results-title');
const searchResultsCount = document.getElementById('search-results-count');
const searchResultsCloseBtn = document.getElementById('search-results-close-btn');

// --- ESTADO DA APLICAÇÃO ---
let cursoCompleto = null;
let slidesAchatados = [];
let slideAtualIndex = -1;
let searchIndex = [];

const appEndpoints = window.APP_ENDPOINTS || {};
const COURSE_DATA_URL = appEndpoints.courseData || 'data.json';

/**
 * Função principal que inicia a aplicação
 */
async function init() {
    console.log('Iniciando o curso...');
    cursoCompleto = await carregarDadosDoCurso();
    if (cursoCompleto) {
        if (!validarIdsUnicos(cursoCompleto.items)) {
            return;
        }
        construirIndiceBusca(cursoCompleto.items);
        achatarSlides(cursoCompleto.items);

        menuContainer.innerHTML = '';
        const menuPrincipal = construirNavegacao(cursoCompleto.items, 0);
        menuContainer.appendChild(menuPrincipal);

        const slideIdFromHash = parseInt(location.hash.replace('#/slide/', ''), 10);
        const startIndex = slidesAchatados.findIndex((s) => s.id === slideIdFromHash);

        exibirSlide(startIndex !== -1 ? startIndex : 0);
    }
    configurarEventos();
}

/**
 * Carrega o data.json usando a API Fetch
 * @returns {Promise<Object|null>}
 */
async function carregarDadosDoCurso() {
    try {
        const response = await fetch(COURSE_DATA_URL);
        if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Não foi possível carregar os dados do curso:', error);
        alert('Erro ao carregar o conteúdo do curso. Verifique o console para mais detalhes.');
        return null;
    }
}

/**
 * Cria uma lista simples (array) de todos os slides de forma recursiva.
 * @param {Array} items - Array de itens (SlideGroups ou Slides)
 */
function achatarSlides(items) {
    for (const item of items) {
        if (item.type === 'Slide') {
            slidesAchatados.push(item);
        } else if (item.type === 'SlideGroup' && item.items) {
            achatarSlides(item.items);
        }
    }
}

/**
 * Valida unicidade dos IDs em toda a estrutura do curso.
 * @param {Array} items - Itens de nível superior do curso
 * @returns {boolean} true se não houver duplicidade
 */
function validarIdsUnicos(items) {
    if (!Array.isArray(items)) {
        console.error('Estrutura de curso inválida: "items" não é um array');
        alert('Erro ao carregar o conteúdo: estrutura inválida.');
        return false;
    }

    const counts = new Map();
    const duplicados = [];

    function walk(arr) {
        for (const item of arr) {
            if (!item || typeof item !== 'object') continue;
            const { id, items: children, type, title } = item;
            if (id !== undefined) {
                const novoTotal = (counts.get(id) || 0) + 1;
                counts.set(id, novoTotal);
                if (novoTotal === 2) {
                    duplicados.push({ id, type, title });
                }
            }
            if (Array.isArray(children)) {
                walk(children);
            }
        }
    }

    walk(items);

    if (duplicados.length > 0) {
        console.error('IDs duplicados encontrados no data.json:', duplicados);
        alert('Erro no conteúdo: IDs duplicados encontrados. Veja o console para detalhes.');
        return false;
    }

    return true;
}

/**
 * Monta um índice de busca a partir dos slides carregados.
 * @param {Array} items - Itens de nivel superior (SlideGroup | Slide)
 */
function construirIndiceBusca(items) {
    searchIndex = [];

    function walk(arr, caminho) {
        for (const item of arr) {
            if (!item || typeof item !== 'object') continue;
            if (item.type === 'Slide') {
                const textos = coletarTextosDoSlide(item);
                const caminhoTexto = caminho.length ? caminho.join(' > ') : '';
                const textoBruto = textos.join(' ').trim();
                searchIndex.push({
                    id: item.id,
                    title: item.title || 'Slide',
                    path: caminhoTexto,
                    textRaw: textoBruto,
                    textNormalized: normalizarTexto(textoBruto),
                });
            } else if (item.type === 'SlideGroup' && Array.isArray(item.items)) {
                const novoCaminho = item.title ? [...caminho, item.title] : caminho.slice();
                walk(item.items, novoCaminho);
            }
        }
    }

    walk(items, []);
    console.log(`Indice de busca criado com ${searchIndex.length} entradas.`);
}

function coletarTextosDoSlide(slide) {
    const coletados = [];
    if (slide.title) coletados.push(slide.title);
    if (slide.subtitle) coletados.push(slide.subtitle);

    if (Array.isArray(slide.elements)) {
        slide.elements.forEach((elemento) => {
            coletados.push(...coletarTextosDoElemento(elemento));
        });
    }

    return coletados;
}

const SEARCHABLE_KEYS = new Set([
    'text',
    'searchText',
    'legend',
    'title',
    'subtitle',
    'question',
    'description',
    'label',
    'body',
    'summary',
    'caption',
]);
const SKIP_KEYS = new Set(['source', 'video', 'audio', 'poster', 'file', 'href', 'link', 'image']);
const FILE_LIKE = /(\.(png|jpe?g|gif|bmp|webp|svg|mp4|webm|mp3|wav|ogg|pdf|docx?|xlsx?|pptx?|zip))$/i;

function coletarTextosDoElemento(elemento) {
    const acc = [];

    function walk(node, key, parentType) {
        if (node == null) return;

        if (typeof node === 'string') {
            const texto = node.trim();
            if (!texto) return;

            if (shouldCapturar(key, parentType) && !FILE_LIKE.test(texto)) {
                acc.push(texto);
            }
            return;
        }

        if (Array.isArray(node)) {
            node.forEach((child) => walk(child, key, parentType));
            return;
        }

        if (typeof node === 'object') {
            const tipoAtual = node.type || parentType;
            for (const [childKey, value] of Object.entries(node)) {
                walk(value, childKey, tipoAtual);
            }
        }
    }

    function shouldCapturar(key, tipo) {
        if (!key) return false;
        if (SKIP_KEYS.has(key)) return false;
        if (key === 'title' && tipo === 'ImageElement') return false;
        if (tipo === 'GridElement' && key === 'content') return true;
        return SEARCHABLE_KEYS.has(key);
    }

    walk(elemento, '', elemento?.type);
    return acc;
}

function normalizarTexto(valor) {
    if (!valor) return '';
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function escapeRegex(str) {
    return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function temMatchExato(textoNormalizado, termoNormalizado) {
    const regex = new RegExp(`\\b${escapeRegex(termoNormalizado)}\\b`, 'i');
    return regex.test(textoNormalizado);
}

function buscarSlides(termo, { exact }) {
    const termoNormalizado = normalizarTexto(termo);
    if (!termoNormalizado) return [];

    return searchIndex
        .map((entrada) => {
            const match = exact
                ? temMatchExato(entrada.textNormalized, termoNormalizado)
                : entrada.textNormalized.includes(termoNormalizado);
            if (!match) return null;
            return {
                slideId: entrada.id,
                slideTitle: entrada.title,
                path: entrada.path,
                snippet: criarSnippet(entrada.textRaw, termoNormalizado),
            };
        })
        .filter(Boolean);
}

function criarSnippet(texto, termoNormalizado) {
    const textoNormalizado = normalizarTexto(texto);
    let idx = textoNormalizado.indexOf(termoNormalizado);
    if (idx === -1) idx = 0;
    const radius = 70;
    const start = Math.max(0, idx - radius);
    const end = Math.min(texto.length, idx + termoNormalizado.length + radius);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < texto.length ? '...' : '';
    return `${prefix}${texto.slice(start, end).trim()}${suffix}`;
}

/**
 * Constrói o menu de navegação de forma recursiva e retorna o elemento UL.
 * @param {Array} items - Itens para adicionar ao menu
 * @param {number} nivel - Nível de profundidade para indentação
 * @returns {HTMLUListElement}
 */
function construirNavegacao(items, nivel) {
    const ul = document.createElement('ul');
    if (nivel > 0) {
        ul.style.paddingLeft = '15px';
    }

    items.forEach((item) => {
        const li = document.createElement('li');

        if (item.type === 'Slide') {
            const a = document.createElement('a');
            a.className = 'menu-item';
            a.textContent = item.title;
            a.dataset.id = item.id;
            li.appendChild(a);
        } else if (item.type === 'SlideGroup') {
            const titleDiv = document.createElement('div');
            titleDiv.className = 'menu-group-title';
            titleDiv.textContent = item.title;
            li.appendChild(titleDiv);

            if (item.items && item.items.length > 0) {
                const subMenuUl = construirNavegacao(item.items, nivel + 1);
                subMenuUl.style.display = 'none';
                li.appendChild(subMenuUl);
            }
        }
        ul.appendChild(li);
    });

    return ul;
}

/**
 * Encontra um slide pelo seu índice na lista achatada e o exibe
 * @param {number} index - O índice do slide no array 'slidesAchatados'
 */
function exibirSlide(index) {
    if (index < 0 || index >= slidesAchatados.length) {
        return;
    }
    slideAtualIndex = index;
    const slide = slidesAchatados[index];
    renderSlide(slide);
    btnAnterior.disabled = slideAtualIndex === 0;
    btnProximo.disabled = slideAtualIndex === slidesAchatados.length - 1;
    atualizarMenuActive(slide.id);
    location.hash = `#/slide/${slide.id}`;
}

/**
 * Destaca o item de menu correspondente ao slide atual
 * @param {number} slideId - O ID do slide que está sendo exibido
 */
function atualizarMenuActive(slideId) {
    const activeItem = menuContainer.querySelector('.menu-item.active');
    if (activeItem) {
        activeItem.classList.remove('active');
    }
    const newItem = menuContainer.querySelector(`.menu-item[data-id="${slideId}"]`);
    if (newItem) {
        newItem.classList.add('active');
    }
}

function abrirFerramentas() {
    if (!toolsOverlay) return;
    toolsOverlay.classList.remove('modal-hidden');
    if (searchInput) {
        setTimeout(() => searchInput.focus(), 50);
    }
}

function fecharFerramentas() {
    if (toolsOverlay) {
        toolsOverlay.classList.add('modal-hidden');
    }
}

/**
 * Executa a busca e abre o modal de resultados.
 */
function executarBusca() {
    if (!searchInput || !searchResultsOverlay) return;
    const termo = (searchInput.value || '').trim();
    if (termo.length < 2) {
        alert('Digite pelo menos 2 caracteres para buscar.');
        return;
    }

    const resultados = buscarSlides(termo, { exact: !!(searchExactCheckbox && searchExactCheckbox.checked) });
    fecharFerramentas();
    abrirResultadosBusca(resultados, termo);
}

function abrirResultadosBusca(resultados, termo) {
    if (!searchResultsOverlay || !searchResultsList) return;
    searchResultsList.innerHTML = '';
    searchResultsTitle.textContent = `Resultados para "${termo}"`;
    const label = resultados.length === 1 ? '1 resultado' : `${resultados.length} resultados`;
    searchResultsCount.textContent = label;

    if (resultados.length === 0) {
        const vazio = document.createElement('div');
        vazio.className = 'search-result-snippet';
        vazio.textContent = 'Nenhum slide encontrado para o termo informado.';
        searchResultsList.appendChild(vazio);
    } else {
        resultados.forEach((item) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'search-result-item';
            card.dataset.slideId = item.slideId;

            const title = document.createElement('div');
            title.className = 'search-result-title';
            title.textContent = item.slideTitle || 'Slide';
            card.appendChild(title);

            if (item.path) {
                const path = document.createElement('div');
                path.className = 'search-result-path';
                path.textContent = item.path;
                card.appendChild(path);
            }

            const snippet = document.createElement('div');
            snippet.className = 'search-result-snippet';
            snippet.textContent = item.snippet;
            card.appendChild(snippet);

            searchResultsList.appendChild(card);
        });
    }

    searchResultsOverlay.classList.remove('modal-hidden');
}

function fecharResultadosBusca() {
    if (searchResultsOverlay) {
        searchResultsOverlay.classList.add('modal-hidden');
    }
}

/**
 * Configura os listeners de eventos para os botões, menu e modal.
 */
function configurarEventos() {
    // Eventos para o menu responsivo
    hamburgerBtn.addEventListener('click', () => {
        if (menuNav.classList.contains('open')) {
            fecharMenuLateral();
        } else {
            abrirMenuLateral();
        }
    });
    menuOverlay.addEventListener('click', fecharMenuLateral);

    // Botão Ferramentas
    if (toolsButton) {
        toolsButton.addEventListener('click', abrirFerramentas);
    }
    if (toolsCloseBtn) {
        toolsCloseBtn.addEventListener('click', fecharFerramentas);
    }
    if (toolsOverlay) {
        toolsOverlay.addEventListener('click', (event) => {
            if (event.target === toolsOverlay) {
                fecharFerramentas();
            }
        });
    }

    // Busca: listeners de envio e resultados
    if (searchButton) {
        searchButton.addEventListener('click', executarBusca);
    }
    if (searchInput) {
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                executarBusca();
            }
        });
    }
    if (searchResultsCloseBtn) {
        searchResultsCloseBtn.addEventListener('click', fecharResultadosBusca);
    }
    if (searchResultsOverlay) {
        searchResultsOverlay.addEventListener('click', (event) => {
            if (event.target === searchResultsOverlay) {
                fecharResultadosBusca();
            }
        });
    }
    if (searchResultsList) {
        searchResultsList.addEventListener('click', (event) => {
            const card = event.target.closest('.search-result-item');
            if (!card) return;
            const slideId = parseInt(card.dataset.slideId, 10);
            const index = slidesAchatados.findIndex((s) => s.id === slideId);
            if (index !== -1) {
                exibirSlide(index);
                fecharResultadosBusca();
                if (window.innerWidth <= 900) {
                    fecharMenuLateral();
                }
            }
        });
    }

    // Listener de clique unificado para o menu
    menuContainer.addEventListener('click', (event) => {
        const target = event.target;

        if (target.classList.contains('menu-group-title')) {
            const subMenu = target.nextElementSibling;
            if (subMenu && subMenu.tagName === 'UL') {
                target.classList.toggle('expanded');
                subMenu.style.display = subMenu.style.display === 'none' ? 'block' : 'none';
            }
        }

        if (target.classList.contains('menu-item')) {
            const slideId = parseInt(target.dataset.id, 10);
            const index = slidesAchatados.findIndex((s) => s.id === slideId);
            if (index !== -1) {
                exibirSlide(index);
                if (window.innerWidth <= 900) {
                    fecharMenuLateral();
                }
            }
        }
    });

    // Eventos já existentes
    btnProximo.addEventListener('click', () => exibirSlide(slideAtualIndex + 1));
    btnAnterior.addEventListener('click', () => exibirSlide(slideAtualIndex - 1));

    modalCloseBtn.addEventListener('click', fecharModal);
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            fecharModal();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (toolsOverlay && !toolsOverlay.classList.contains('modal-hidden')) {
                fecharFerramentas();
                return;
            }
            if (searchResultsOverlay && !searchResultsOverlay.classList.contains('modal-hidden')) {
                fecharResultadosBusca();
                return;
            }
            if (!modalOverlay.classList.contains('modal-hidden')) {
                fecharModal();
            }
        }
    });

    // NOVO: Listener para redimensionamento da janela
    window.addEventListener('resize', () => {
        // Se a janela for maior que 900px, garante que o menu mobile esteja fechado
        if (window.innerWidth > 900) {
            fecharMenuLateral();
        }
    });
}

// --- FUNÇÕES DE CONTROLE DO MENU RESPONSIVO ---
/**
 * NOVO: Abre o menu lateral em telas pequenas.
 */
function abrirMenuLateral() {
    menuNav.classList.add('open');
    hamburgerBtn.classList.add('active');
    menuOverlay.classList.remove('hidden');
}

/**
 * NOVO: Fecha o menu lateral em telas pequenas.
 */
function fecharMenuLateral() {
    menuNav.classList.remove('open');
    hamburgerBtn.classList.remove('active');
    menuOverlay.classList.add('hidden');
}

// --- FUNÇÕES DE CONTROLE DO MODAL ---
export function abrirModal(infoBoxData) {
    modalContent.innerHTML = '';
    modalTitle.textContent = infoBoxData.title || 'Informação';
    const groupElementData = {
        type: 'GroupElement',
        elements: infoBoxData.elements,
        mode: infoBoxData.mode || 'verticalGroup',
        verticalAlign: infoBoxData.verticalAlign,
        horizontalAlign: infoBoxData.horizontalAlign,
    };
    const content = criarElemento(groupElementData);
    if (content) {
        modalContent.appendChild(content);
    }
    modalOverlay.classList.remove('modal-hidden');
}

function fecharModal() {
    modalOverlay.classList.add('modal-hidden');
}

// Inicia a aplicação
document.addEventListener('DOMContentLoaded', init);
