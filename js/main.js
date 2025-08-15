/**
 * main.js
 * Orquestrador principal da aplicação.
 * Responsável por:
 * - Carregar os dados do curso.
 * - Construir a navegação.
 * - Gerenciar o estado (slide atual).
 * - Controlar os eventos de navegação e do modal.
 */

// Importa as funções de renderização que precisaremos aqui
import { renderSlide, criarElemento } from './renderer.js';

// --- ELEMENTOS DA DOM ---
const menuContainer = document.getElementById('menu-items');
const btnAnterior = document.getElementById('btn-anterior');
const btnProximo = document.getElementById('btn-proximo');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalCloseBtn = document.getElementById('modal-close-btn');

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
        construirNavegacao(cursoCompleto.items, menuContainer, 0);
        
        // Verifica se há um slide na URL (hash) para carregar
        const slideIdFromHash = parseInt(location.hash.replace('#/slide/', ''), 10);
        const startIndex = slidesAchatados.findIndex(s => s.id === slideIdFromHash);

        exibirSlide(startIndex !== -1 ? startIndex : 0); // Exibe o slide da URL ou o primeiro
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
            achatarSlides(item.items); // Chamada recursiva para subgrupos
        }
    }
}

/**
 * Constrói o menu de navegação de forma recursiva
 * @param {Array} items - Itens para adicionar ao menu
 * @param {HTMLElement} parentElement - O elemento pai onde o menu será inserido
 * @param {number} nivel - Nível de profundidade para indentação
 */
function construirNavegacao(items, parentElement, nivel) {
    const ul = document.createElement('ul');
    ul.style.paddingLeft = `${nivel * 15}px`;

    items.forEach(item => {
        const li = document.createElement('li');

        if (item.type === 'Slide') {
            const a = document.createElement('a');
            a.className = 'menu-item';
            a.textContent = item.title;
            a.dataset.id = item.id; // Usamos data-id para identificar o slide
            li.appendChild(a);
        } else if (item.type === 'SlideGroup') {
            const titleDiv = document.createElement('div');
            titleDiv.className = 'menu-group-title';
            titleDiv.textContent = item.title;
            li.appendChild(titleDiv);

            // Recursivamente constrói o submenu, que começa oculto
            const subMenuUl = construirNavegacao(item.items, li, nivel + 1);
            subMenuUl.style.display = 'none';
            
            titleDiv.addEventListener('click', () => {
                titleDiv.classList.toggle('expanded');
                subMenuUl.style.display = subMenuUl.style.display === 'none' ? 'block' : 'none';
            });
        }
        parentElement.appendChild(li);
    });

    return ul; // Retorna o ul para a lógica de expandir/recolher
}

/**
 * Encontra um slide pelo seu índice na lista achatada e o exibe
 * @param {number} index - O índice do slide no array 'slidesAchatados'
 */
function exibirSlide(index) {
    if (index < 0 || index >= slidesAchatados.length) {
        console.warn("Índice de slide inválido:", index);
        return;
    }

    slideAtualIndex = index;
    const slide = slidesAchatados[index];
    renderSlide(slide); // Chama o renderizador

    // Atualiza o estado dos botões de navegação
    btnAnterior.disabled = (slideAtualIndex === 0);
    btnProximo.disabled = (slideAtualIndex === slidesAchatados.length - 1);

    // Atualiza o menu ativo
    atualizarMenuActive(slide.id);

    // Atualiza a URL com o hash
    location.hash = `#/slide/${slide.id}`;
}

/**
 * Destaca o item de menu correspondente ao slide atual
 * @param {number} slideId - O ID do slide que está sendo exibido
 */
function atualizarMenuActive(slideId) {
    // Remove a classe 'active' de qualquer item que a tenha
    const activeItem = menuContainer.querySelector('.menu-item.active');
    if (activeItem) {
        activeItem.classList.remove('active');
    }

    // Adiciona a classe 'active' ao novo item
    const newItem = menuContainer.querySelector(`.menu-item[data-id="${slideId}"]`);
    if (newItem) {
        newItem.classList.add('active');
    }
}

/**
 * Configura os listeners de eventos para os botões, menu e modal.
 */
function configurarEventos() {
    // Listener para o menu de navegação
    menuContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('menu-item')) {
            const slideId = parseInt(target.dataset.id, 10);
            const index = slidesAchatados.findIndex(s => s.id === slideId);
            if (index !== -1) {
                exibirSlide(index);
            }
        }
    });

    // Listener para os botões Próximo e Anterior
    btnProximo.addEventListener('click', () => exibirSlide(slideAtualIndex + 1));
    btnAnterior.addEventListener('click', () => exibirSlide(slideAtualIndex - 1));

    // Listeners para fechar o modal
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
}

// --- FUNÇÕES DE CONTROLE DO MODAL ---

/**
 * Preenche e exibe o modal com o conteúdo de um InfoBoxElement.
 * @param {Object} infoBoxData - O objeto InfoBoxElement clicado.
 */
export function abrirModal(infoBoxData) {
    modalContent.innerHTML = '';
    modalTitle.textContent = infoBoxData.title || 'Informação';

    // Cria um "pseudo-GroupElement" para reutilizar a lógica de renderização
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

/**
 * Oculta o modal.
 */
function fecharModal() {
    modalOverlay.classList.add('modal-hidden');
}


// Inicia a aplicação quando o DOM estiver completamente carregado
document.addEventListener('DOMContentLoaded', init);