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


// --- ESTADO DA APLICAÇÃO ---
let cursoCompleto = null;
let slidesAchatados = [];
let slideAtualIndex = -1;

/**
 * Função principal que inicia a aplicação
 */
async function init() {
    console.log("Iniciando o curso...");
    cursoCompleto = await carregarDadosDoCurso();
    if (cursoCompleto) {
        achatarSlides(cursoCompleto.items);
        
        menuContainer.innerHTML = ''; 
        const menuPrincipal = construirNavegacao(cursoCompleto.items, 0);
        menuContainer.appendChild(menuPrincipal);
        
        const slideIdFromHash = parseInt(location.hash.replace('#/slide/', ''), 10);
        const startIndex = slidesAchatados.findIndex(s => s.id === slideIdFromHash);
        
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
        const response = await fetch('data.json');
        if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Não foi possível carregar os dados do curso:", error);
        alert("Erro ao carregar o conteúdo do curso. Verifique o console para mais detalhes.");
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

    items.forEach(item => {
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
    btnAnterior.disabled = (slideAtualIndex === 0);
    btnProximo.disabled = (slideAtualIndex === slidesAchatados.length - 1);
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
            const index = slidesAchatados.findIndex(s => s.id === slideId);
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
        if (event.key === 'Escape' && !modalOverlay.classList.contains('modal-hidden')) {
            fecharModal();
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