/**
 * infobox-element.js
 * Sistema de InfoBox: botão amarelo posicionado + modal.
 * - Ancoragem por elemento (anchorMode): 'auto-prev' | 'container' | 'flow-end'  // [NEW]
 * - Suporte robusto a anchorSelector e grupos (.group-container)
 */

import { atualizarAlturaDoContainer, setupCleanup } from './base.js';

// Modo de ancoragem GLOBAL padrão (fallback para elementos sem anchorMode)
// Mantém compatibilidade com versões antigas do data.json.
const INFOBOX_ANCHOR_MODE = 'auto-prev'; // 'auto-prev' | 'container'

// ID do contêiner do slide
const SLIDE_CONTAINER_ID = 'slide-elements-container';

/* ============================================================================
   Utilitários
   ========================================================================== */

/**
 * Retorna o root de escopo preferencial para posicionamento:
 * - Se o botão estiver (ou ficará) dentro de um .group-container, usar esse group;
 * - Caso contrário, usar o slide inteiro (#slide-elements-container).
 */
function obterRootDeEscopo(button) {
  let group = null;
  if (button && button.isConnected) {
    group = button.closest?.('.group-container') || null;
  }
  const slide = document.getElementById(SLIDE_CONTAINER_ID);
  return group || slide;
}

/**
 * Dentro de um root (group ou slide), encontra o "último elemento renderizado"
 * que não seja um gatilho de infobox nem o dock.
 */
function obterAnchorElAutoPrev(root) {
  if (!root) return null;
  const children = Array.from(root.children || []);
  for (let i = children.length - 1; i >= 0; i--) {
    const el = children[i];
    if (!el.classList?.contains('infobox-trigger') && !el.classList?.contains('infobox-dock')) {
      return el;
    }
  }
  return null;
}

/**
 * Resolve o alvo real a partir de um seletor, priorizando:
 * 1) Busca no root correto (grupo se houver, senão slide),
 * 2) Busca relativa ao anchorEl,
 * 3) Caso especial: se anchorEl for <figure.image-element>, tenta o <img> interno,
 * 4) Fallback para anchorEl ou root.
 */
function resolverAlvoAncora({ root, anchorEl, anchorSelector }) {
  if (anchorSelector) {
    let target = null;
    try { target = root?.querySelector(anchorSelector) || null; } catch { /* ignore */ }
    if (!target && anchorEl) {
      try { target = anchorEl.querySelector(anchorSelector) || null; } catch { /* ignore */ }
    }
    if (!target && anchorEl?.tagName === 'FIGURE' && anchorEl.classList.contains('image-element')) {
      target = anchorEl.querySelector('img');
    }
    return target || anchorEl || root;
  }

  if (anchorEl?.tagName === 'FIGURE' && anchorEl.classList.contains('image-element')) {
    return anchorEl.querySelector('img') || anchorEl;
  }
  return anchorEl || root;
}

/**
 * Observa mídias internas (img, video, iframe) para reposicionar quando carregarem.
 */
function observarMidiasDoAlvo(anchorTarget, onUpdate) {
  if (!anchorTarget?.querySelectorAll) return;
  anchorTarget.querySelectorAll('img, video, iframe').forEach(mediaEl => {
    const onLoad = () => onUpdate();
    if ('complete' in mediaEl) {
      if (!mediaEl.complete) mediaEl.addEventListener('load', onLoad, { once: true });
    } else {
      mediaEl.addEventListener('load', onLoad, { once: true });
    }
    mediaEl.addEventListener?.('loadedmetadata', onLoad, { once: true });
  });
}

/* ============================================================================
   Dock para o modo 'flow-end'  // [NEW]
   ========================================================================== */

/**
 * Garante (cria, se necessário) um contêiner "dock" no final do slide para
 * alinhar os triggers horizontalmente (modo 'flow-end').
 * - É um elemento de fluxo (NÃO absoluto), para realmente ficar “após” os demais.
 */
function ensureInfoboxDock(slideContainer) {
  if (!slideContainer) return null;
  let dock = slideContainer.querySelector('.infobox-dock');
  if (!dock) {
    dock = document.createElement('div');
    dock.className = 'infobox-dock';
    // Estilos mínimos inline para funcionar mesmo sem CSS:
    // (recomenda-se mover para style.css depois)
    dock.style.display = 'flex';
    dock.style.flexWrap = 'wrap';
    dock.style.alignItems = 'center';
    dock.style.gap = '8px';
    dock.style.marginTop = '8px';
    dock.style.minHeight = '40px';
    slideContainer.appendChild(dock);
    requestAnimationFrame(() => atualizarAlturaDoContainer());
  }
  return dock;
}

/* ============================================================================
   Criação do gatilho (botão) do InfoBox
   ========================================================================== */

/**
 * Cria o botão gatilho do InfoBox com posicionamento inteligente.
 * Suporta por elemento:
 *  - element.anchorMode: 'auto-prev' | 'container' | 'flow-end'              // [NEW]
 *  - element.anchorSelector / element.anchorElement
 *  - element.anchorCorner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
 *  - element.x / element.y: offsets (px)
 *  - element.triggerContent: HTML (fallback 'i')
 */
export function criarGatilhoInfoBox(element, abrirModalFn) {
  const button = document.createElement('button');
  button.className = 'infobox-trigger';
  button.style.position = 'absolute';
  button.title = `Info: ${element.title || ''}`;
  button.innerHTML = element.triggerContent || 'i';

  // [NEW] Modo por elemento com fallback no global
  const anchorMode = (element.anchorMode || INFOBOX_ANCHOR_MODE || 'auto-prev').toLowerCase();

  // Configurações comuns
  const anchorCorner = (element.anchorCorner || 'top-right').toLowerCase();
  const anchorSelector = element.anchorSelector || element.anchorElement || '';

  // Vars dinâmicas
  let root = null;
  let anchorEl = null;
  let anchorTarget = null;
  let ro = null;

  /* ------------------------------------------------------------------------
     MODO 'flow-end'  // [NEW]
     - Botões vão para um dock no final do slide, distribuídos com flex-box
     - Sem posicionamento absoluto, sem x/y/anchorCorner
     ---------------------------------------------------------------------- */
  if (anchorMode === 'flow-end') {
    // [NEW] No flow-end, o botão participa do fluxo (estático)
    button.style.position = 'static';
    button.style.left = '';
    button.style.top = '';

    const slideContainer = document.getElementById(SLIDE_CONTAINER_ID);
    const dock = ensureInfoboxDock(slideContainer);

    // [NEW] Garante que o botão fique dentro do dock mesmo que o chamador insira fora
    const moveIntoDock = () => {
      if (!dock || !button.isConnected) return;
      if (button.parentElement !== dock) {
        dock.appendChild(button);
        requestAnimationFrame(() => atualizarAlturaDoContainer());
      }
    };

    if (button.isConnected) {
      moveIntoDock();
    } else {
      const mo = new MutationObserver(() => {
        if (button.isConnected) {
          moveIntoDock();
          mo.disconnect(); // desaloca após a primeira realocação
        }
      });
      // Observa o slide inteiro (ou body, como fallback) até o botão entrar no DOM
      mo.observe(slideContainer || document.body, { childList: true, subtree: true });
    }

    // Abre modal ao clicar
    button.addEventListener('click', () => abrirModalFn?.(element));

    // Cleanup
    setupCleanup(button, () => {
      // Nada pendente aqui (o MutationObserver é encerrado ao realocar)
    });

    return button;
  }

  /* ------------------------------------------------------------------------
     MODO 'auto-prev' | 'container'  (posicionamento absoluto)
     ---------------------------------------------------------------------- */

  // Utilitário para recomputar root/âncora/target e instalar observers
  const recomputarEscopoEObservadores = () => {
    // Root: se o botão já estiver num group, usar group; senão, slide
    root = obterRootDeEscopo(button) || document.getElementById(SLIDE_CONTAINER_ID);

    if (anchorMode === 'container' || !root) {
      anchorEl = null; // 'container' ignora elemento anterior
    } else {
      // 'auto-prev': procurar último elemento renderizado dentro do root
      anchorEl = obterAnchorElAutoPrev(root);
    }

    // Resolve alvo final (anchorSelector, caso especial figure>img)
    anchorTarget = resolverAlvoAncora({ root, anchorEl, anchorSelector });

    // Instala ResizeObserver para reagir a mudanças de tamanho
    if (ro) ro.disconnect();
    ro = new ResizeObserver(() => {
      applyPosition();
      atualizarAlturaDoContainer();
    });

    if (root) ro.observe(root);
    if (anchorTarget) {
      ro.observe(anchorTarget);
      observarMidiasDoAlvo(anchorTarget, () => {
        applyPosition();
        atualizarAlturaDoContainer();
      });
    }
  };

  /**
   * Aplica a posição absoluta do botão relativamente ao root/anchorTarget:
   * - Baseia-se no canto superior esquerdo do target;
   * - Ajusta pelo canto escolhido (anchorCorner);
   * - Soma offsets (x, y);
   * - Faz clamp para manter dentro do root.
   */
  const applyPosition = () => {
    if (!button.isConnected) return;

    if (!root || !anchorTarget) {
      recomputarEscopoEObservadores();
      if (!root) return;
    }

    const contRect = root.getBoundingClientRect();

    let left = Number(element.x) || 0;
    let top  = Number(element.y) || 0;

    if (anchorMode !== 'container' && anchorTarget?.isConnected) {
      const aRect = anchorTarget.getBoundingClientRect();
      left += (aRect.left - contRect.left);
      top  += (aRect.top  - contRect.top);

      if (anchorCorner.includes('right')) {
        left += anchorTarget.offsetWidth;
      }
      if (anchorCorner.includes('bottom')) {
        top += anchorTarget.offsetHeight;
      }
    }

    const maxLeft = root.clientWidth  - button.offsetWidth;
    const maxTop  = root.clientHeight - button.offsetHeight;
    left = Math.max(0, Math.min(left, maxLeft));
    top  = Math.max(0, Math.min(top,  maxTop));

    button.style.left = `${left}px`;
    button.style.top  = `${top}px`;
  };

  // Reposiciona em resize da janela
  const onResize = () => {
    if (!button.isConnected) {
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
      return;
    }
    applyPosition();
    atualizarAlturaDoContainer();
  };
  window.addEventListener('resize', onResize);

  // Abre modal ao clicar
  button.addEventListener('click', () => {
    abrirModalFn?.(element);
  });

  // Cleanup ao remover do DOM
  setupCleanup(button, () => {
    window.removeEventListener('resize', onResize);
    if (ro) ro.disconnect();
    ro = null;
  });

  // Posicionamento inicial (após entrar no DOM)
  requestAnimationFrame(() => {
    recomputarEscopoEObservadores();
    applyPosition();
    atualizarAlturaDoContainer();
  });

  return button;
}
