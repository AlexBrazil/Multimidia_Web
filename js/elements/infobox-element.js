/**
 * infobox-element.js
 * Sistema complexo de InfoBox: botão amarelo posicionado + modal.
 * Responsável pelo posicionamento absoluto e integração com sistema modal.
 */

import { atualizarAlturaDoContainer, setupCleanup } from './base.js';

// Configuração de ancoragem do InfoBox
const INFOBOX_ANCHOR_MODE = 'auto-prev';
const container = document.getElementById('slide-elements-container');

/**
 * Cria o botão gatilho do InfoBox com posicionamento inteligente
 * @param {Object} element - Objeto InfoBoxElement do data.json
 * @param {string} element.title - Título do InfoBox
 * @param {Array} element.elements - Elementos internos do modal
 * @param {number} element.x - Posição X relativa
 * @param {number} element.y - Posição Y relativa
 * @param {string} element.mode - Layout do modal ('verticalGroup'|'horizontalGroup')
 * @param {string} element.verticalAlign - Alinhamento vertical do modal
 * @param {string} element.horizontalAlign - Alinhamento horizontal do modal
 * @param {boolean} element.fillHeight - Se modal deve preencher altura
 * @param {Function} abrirModalFn - Função para abrir modal (do main.js)
 * @returns {HTMLButtonElement} Botão do InfoBox
 */
export function criarGatilhoInfoBox(element, abrirModalFn) {
    const button = document.createElement('button');
    button.className = 'infobox-trigger';
    button.innerHTML = 'i';
    button.title = `Info: ${element.title}`;

    // Posicionamento absoluto relativo ao container
    button.style.position = 'absolute';

    // Determina elemento âncora para posicionamento
    let anchorEl = null;
    if (INFOBOX_ANCHOR_MODE === 'auto-prev') {
        // Pega o último elemento renderizado (exceto outros InfoBoxes)
        const children = Array.from(container.children);
        for (let i = children.length - 1; i >= 0; i--) {
            const el = children[i];
            if (!el.classList.contains('infobox-trigger')) {
                anchorEl = el;
                break;
            }
        }
    }
    
    const useContainerOnly = INFOBOX_ANCHOR_MODE === 'container' || !anchorEl;

    /**
     * Aplica posicionamento inteligente do botão
     */
    const applyPosition = () => {
        if (!button.isConnected) return;

        const contRect = container.getBoundingClientRect();
        let left = (element.x || 0);
        let top = (element.y || 0);

        // Posicionamento relativo ao elemento anterior
        if (!useContainerOnly && anchorEl && anchorEl.isConnected) {
            const aRect = anchorEl.getBoundingClientRect();
            left = (aRect.left - contRect.left) + (element.x || 0);
            top = (aRect.top - contRect.top) + (element.y || 0);
        }

        // CLAMP: garante que o botão caiba no container
        const maxLeft = container.clientWidth - button.offsetWidth;
        const maxTop = container.clientHeight - button.offsetHeight;
        left = Math.max(0, Math.min(left, maxLeft));
        top = Math.max(0, Math.min(top, maxTop));

        button.style.left = `${left}px`;
        button.style.top = `${top}px`;
    };

    // Observadores para acompanhar mudanças de layout
    const ro = new ResizeObserver(() => {
        applyPosition();
        atualizarAlturaDoContainer();
    });
    ro.observe(container);
    if (anchorEl) ro.observe(anchorEl);

    // Reposiciona quando mídia do elemento âncora carregar
    if (anchorEl) {
        anchorEl.querySelectorAll('img, video, iframe').forEach(mediaEl => {
            const onLoad = () => {
                applyPosition();
                atualizarAlturaDoContainer();
            };
            
            // Tratamento específico por tipo de mídia
            if ('complete' in mediaEl) {
                if (!mediaEl.complete) mediaEl.addEventListener('load', onLoad, { once: true });
            } else {
                mediaEl.addEventListener('load', onLoad, { once: true });
            }
            mediaEl.addEventListener?.('loadedmetadata', onLoad, { once: true });
        });
    }

    // Listener de redimensionamento da janela
    const onResize = () => {
        if (!button.isConnected) {
            window.removeEventListener('resize', onResize);
            ro.disconnect();
            return;
        }
        applyPosition();
        atualizarAlturaDoContainer();
    };
    window.addEventListener('resize', onResize);

    // Cleanup automático quando botão sair do DOM
    setupCleanup(button, () => {
        window.removeEventListener('resize', onResize);
        ro.disconnect();
    });

    // Event listener do clique → abre modal
    button.addEventListener('click', () => {
        if (abrirModalFn) {
            abrirModalFn(element);
        }
    });

    // Posicionamento inicial (próxima frame para layout estável)
    requestAnimationFrame(() => {
        applyPosition();
        atualizarAlturaDoContainer();
    });

    return button;
}