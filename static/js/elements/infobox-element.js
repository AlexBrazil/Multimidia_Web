/**
 * infobox-element.js
 * Sistema de InfoBox: botão amarelo posicionado + modal.
 * - Ancoragem por elemento (anchorMode): 'auto-prev' | 'container' | 'flow-end'
 * - Suporte robusto a anchorSelector e grupos (.group-container)
 */

import { atualizarAlturaDoContainer, setupCleanup } from './base.js';

const INFOBOX_ANCHOR_MODE = 'auto-prev';
const SLIDE_CONTAINER_ID = 'slide-elements-container';

/* ============================================================================
   Utilitários
   ========================================================================== */

function obterRootDeEscopo(button) {
  let group = null;
  if (button && button.isConnected) {
    group = button.closest?.('.group-container') || null;
  }
  const slide = document.getElementById(SLIDE_CONTAINER_ID);
  return group || slide;
}

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

function resolverAlvoAncora({ root, anchorEl, anchorSelector }) {
  if (anchorSelector) {
    let target = null;
    try { target = root?.querySelector(anchorSelector) || null; } catch {}
    if (!target && anchorEl) {
      try { target = anchorEl.querySelector(anchorSelector) || null; } catch {}
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
   Dock para o modo 'flow-end'
   ========================================================================== */

function ensureInfoboxDock(slideContainer) {
  if (!slideContainer) return null;
  let dock = slideContainer.querySelector('.infobox-dock');
  if (!dock) {
    dock = document.createElement('div');
    dock.className = 'infobox-dock';
    // estilos mínimos inline (mantenha seu CSS separado se preferir)
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
   Criação do gatilho
   ========================================================================== */

export function criarGatilhoInfoBox(element, abrirModalFn) {
  const button = document.createElement('button');
  button.className = 'infobox-trigger';
  button.style.position = 'absolute';
  button.title = `Info: ${element.title || ''}`;
  button.innerHTML = element.triggerContent || 'i';

  const anchorMode = (element.anchorMode || INFOBOX_ANCHOR_MODE || 'auto-prev').toLowerCase();
  const anchorCorner = (element.anchorCorner || 'top-right').toLowerCase();
  const anchorSelector = element.anchorSelector || element.anchorElement || '';

  let root = null;
  let anchorEl = null;
  let anchorTarget = null;
  let ro = null;

  /* ------------------------------------------------------------------------
     MODO 'flow-end' (sem posição absoluta)
     ---------------------------------------------------------------------- */
  if (anchorMode === 'flow-end') {
    button.style.position = 'static';
    button.style.left = '';
    button.style.top = '';

    const slideContainer = document.getElementById(SLIDE_CONTAINER_ID);
    const dock = ensureInfoboxDock(slideContainer);

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
          mo.disconnect();
        }
      });
      mo.observe(slideContainer || document.body, { childList: true, subtree: true });
    }

    button.addEventListener('click', () => abrirModalFn?.(element));

    setupCleanup(button, () => { /* nada extra */ });

    return button;
  }

  /* ------------------------------------------------------------------------
     MODO 'auto-prev' | 'container' (posição absoluta)
     ---------------------------------------------------------------------- */

  const recomputarEscopoEObservadores = () => {
    root = obterRootDeEscopo(button) || document.getElementById(SLIDE_CONTAINER_ID);

    if (anchorMode === 'container' || !root) {
      anchorEl = null;
    } else {
      anchorEl = obterAnchorElAutoPrev(root);
    }

    anchorTarget = resolverAlvoAncora({ root, anchorEl, anchorSelector });

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
   * [FIX] Espera a “estabilização” inicial do layout
   * - aguarda o botão estar no DOM;
   * - aguarda 2 frames (layout/paint);
   * - aguarda fontes web (document.fonts.ready);
   * - faz um pequeno loop de settling (até 3 tentativas) caso as medidas mudem.
   */
  async function initialStablePositioning() {
    // Espera estar conectado
    if (!button.isConnected) {
      await new Promise(r => requestAnimationFrame(r));
    }

    // Dois frames para layout/paint inicial
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));

    // Espera fontes (quando suportado)
    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch {}
    }

    // Se o anchorSelector depende de elementos que ainda vão aparecer, observa por curto período
    let selectorFound = !!(anchorSelector && (obterRootDeEscopo(button)?.querySelector(anchorSelector)));
    if (anchorSelector && !selectorFound) {
      selectorFound = await waitForSelectorOnce(anchorSelector, obterRootDeEscopo(button), 300);
    }

    recomputarEscopoEObservadores();

    // Settling loop: se o retângulo do target mudar de tamanho entre tentativas, reposiciona
    let lastRect = rectOf(anchorTarget);
    for (let i = 0; i < 3; i++) {
      applyPosition();
      await new Promise(r => setTimeout(r, 50));
      const nowRect = rectOf(anchorTarget);
      if (!rectChanged(lastRect, nowRect)) break;
      lastRect = nowRect;
    }
    atualizarAlturaDoContainer();
  }

  // util: pega retângulo seguro
  function rectOf(el) {
    if (!el || !el.isConnected) return { x:0,y:0,width:0,height:0 };
    const r = el.getBoundingClientRect();
    return { x:r.x, y:r.y, width:r.width, height:r.height };
  }
  function rectChanged(a, b) {
    const eps = 0.5; // tolerância
    return Math.abs(a.x-b.x)>eps || Math.abs(a.y-b.y)>eps || Math.abs(a.width-b.width)>eps || Math.abs(a.height-b.height)>eps;
  }

  // [FIX] Observa surgimento tardio do anchorSelector (uma vez)
  function waitForSelectorOnce(selector, scope, timeoutMs = 500) {
    return new Promise(resolve => {
      let done = false;
      const scopeNode = scope || document;
      let timer = setTimeout(() => { cleanup(false); }, timeoutMs);

      const found = safeQuery(scopeNode, selector);
      if (found) { cleanup(true); return; }

      const mo = new MutationObserver(() => {
        if (safeQuery(scopeNode, selector)) {
          cleanup(true);
        }
      });
      mo.observe(scopeNode, { childList: true, subtree: true });

      function cleanup(result) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { mo.disconnect(); } catch {}
        resolve(result);
      }
    });
  }
  function safeQuery(node, selector) {
    try { return node.querySelector(selector); } catch { return null; }
  }

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

      // [FIX] usa largura/altura geométrica do rect (mais estável)
      const w = aRect.width;
      const h = aRect.height;

      if (anchorCorner.includes('right')) {
        left += w;
      }
      if (anchorCorner.includes('bottom')) {
        top += h;
      }
    }

    const maxLeft = root.clientWidth  - button.offsetWidth;
    const maxTop  = root.clientHeight - button.offsetHeight;
    left = Math.max(0, Math.min(left, maxLeft));
    top  = Math.max(0, Math.min(top,  maxTop));

    button.style.left = `${left}px`;
    button.style.top  = `${top}px`;
  };

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

  button.addEventListener('click', () => {
    abrirModalFn?.(element);
  });

  setupCleanup(button, () => {
    window.removeEventListener('resize', onResize);
    if (ro) ro.disconnect();
    ro = null;
  });

  // [FIX] posicionamento inicial robusto
  requestAnimationFrame(() => {
    initialStablePositioning();
  });

  return button;
}
