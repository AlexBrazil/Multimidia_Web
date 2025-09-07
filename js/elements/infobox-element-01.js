/**
 * infobox-element.js
 * Sistema complexo de InfoBox: botão amarelo posicionado + modal.
 * Responsável pelo posicionamento absoluto e integração com sistema modal.
 */

import { atualizarAlturaDoContainer, setupCleanup } from './base.js';

// Modo de ancoragem global (auto-prev ou container)
const INFOBOX_ANCHOR_MODE = 'auto-prev';
const container = document.getElementById('slide-elements-container');

/**
 * Cria o botão gatilho do InfoBox com posicionamento inteligente.
 * Agora lê `element.anchorCorner` para ajustar a referência do canto.
 *
 * @param {Object} element - Objeto InfoBoxElement do data.json
 * @param {Function} abrirModalFn - Função para abrir modal (do main.js)
 * @returns {HTMLButtonElement}
 * 
 * No data.json os valores possíveis para anchorCorner são:
 * "top-left", "top-right", "bottom-left" ou "bottom-right"
 * 
 */
export function criarGatilhoInfoBox(element, abrirModalFn) {
  const button = document.createElement('button');
  button.className = 'infobox-trigger';
  button.innerHTML = 'i';
  button.title = `Info: ${element.title || ''}`;
  button.style.position = 'absolute';

  // Campo opcional do JSON. Aceita: 'top-left', 'top-right', 'bottom-left', 'bottom-right'.
  const anchorCorner = (element.anchorCorner || 'top-right').toLowerCase();

  // Determina o elemento âncora (último elemento renderizado, exceto outros infoboxes)
  let anchorEl = null;
  if (INFOBOX_ANCHOR_MODE === 'auto-prev') {
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
   * Aplica o posicionamento do botão de acordo com o elemento-âncora,
   * o canto escolhido e os deslocamentos x / y definidos no JSON.
   */
  const applyPosition = () => {
    if (!button.isConnected) return;

    const contRect = container.getBoundingClientRect();
    let left = element.x || 0;
    let top  = element.y || 0;

    if (!useContainerOnly && anchorEl && anchorEl.isConnected) {
      const aRect = anchorEl.getBoundingClientRect();
      left = (aRect.left - contRect.left) + left;
      top  = (aRect.top  - contRect.top) + top;

      // Ajusta de acordo com o canto escolhido
      if (anchorCorner.includes('right')) {
        left += anchorEl.offsetWidth;
      }
      if (anchorCorner.includes('bottom')) {
        top += anchorEl.offsetHeight;
      }
    }

    // Restringe o botão à área visível do contêiner
    const maxLeft = container.clientWidth  - button.offsetWidth;
    const maxTop  = container.clientHeight - button.offsetHeight;
    left = Math.max(0, Math.min(left, maxLeft));
    top  = Math.max(0, Math.min(top,  maxTop));

    button.style.left = `${left}px`;
    button.style.top  = `${top}px`;
  };

  // Observa mudanças de tamanho e reposiciona conforme necessário
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
      if ('complete' in mediaEl) {
        if (!mediaEl.complete) mediaEl.addEventListener('load', onLoad, { once: true });
      } else {
        mediaEl.addEventListener('load', onLoad, { once: true });
      }
      mediaEl.addEventListener?.('loadedmetadata', onLoad, { once: true });
    });
  }

  // Ouve redimensionamentos da janela
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

  // Cleanup quando o botão sai do DOM
  setupCleanup(button, () => {
    window.removeEventListener('resize', onResize);
    ro.disconnect();
  });

  // Abre modal ao clicar
  button.addEventListener('click', () => {
    abrirModalFn?.(element);
  });

  // Posicionamento inicial no próximo frame
  requestAnimationFrame(() => {
    applyPosition();
    atualizarAlturaDoContainer();
  });

  return button;
}
