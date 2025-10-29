// js/elements/compare-slider-element.js
// Elemento de comparaÃ§Ã£o "Antes/Depois" com alÃ§a deslizante (responsivo + acessÃ­vel)

import { setupCleanup } from './base.js';
import { resolveImageAsset } from '../utils/asset-path.js';

/**
 * @typedef {Object} CompareImageCfg
 * @property {string} src - caminho da imagem
 * @property {string} [alt] - descriÃ§Ã£o (acessibilidade)
 */

/**
 * @typedef {Object} CompareSliderCfg
 * @property {'CompareSliderElement'} type
 * @property {string} [id]
 * @property {CompareImageCfg} before
 * @property {CompareImageCfg} after
 * @property {string} [beforeLabel] - rÃ³tulo sobre a imagem "antes"
 * @property {string} [afterLabel] - rÃ³tulo sobre a imagem "depois"
 * @property {number} [position] - posiÃ§Ã£o inicial (0..100), default 50
 * @property {string} [height] - ex.: "360px" (opcional). Se ausente, usa ratio automÃ¡tico.
 * @property {string} [caption] - legenda opcional
 */

export function criarCompareSlider(cfg) {
  if (!cfg || cfg.type !== 'CompareSliderElement') {
    console.warn('CompareSliderElement: config invÃ¡lida', cfg);
    return null;
  }
  if (!cfg.before?.src || !cfg.after?.src) {
    console.warn('CompareSliderElement: "before.src" e "after.src" sÃ£o obrigatÃ³rios');
    return null;
  }

  const posClamp = (v) => Math.min(100, Math.max(0, Number.isFinite(v) ? v : 50));
  let value = posClamp(cfg.position ?? 50);

  // Raiz
  const root = document.createElement('section');
  root.className = 'compare-slider';
  root.style.setProperty('--pos', value + '%');

  if (cfg.id) root.id = cfg.id;

  // Wrapper visual
  const frame = document.createElement('div');
  frame.className = 'cmp-frame';
  root.appendChild(frame);
  if (cfg.height) {
    frame.style.setProperty('--cmp-max-height', cfg.height);
  }

  // Camada "antes" (fundo)
  const beforeWrap = document.createElement('div');
  beforeWrap.className = 'cmp-pane cmp-before';
  const beforeImg = document.createElement('img');
  const beforeSrc = resolveImageAsset(cfg.before.src) || cfg.before.src;
  beforeImg.src = beforeSrc;
  beforeImg.alt = cfg.before.alt || '';
  beforeImg.loading = 'lazy';
  beforeWrap.appendChild(beforeImg);
  frame.appendChild(beforeWrap);

  // Camada "depois" (cortada pela posiÃ§Ã£o)
  const afterWrap = document.createElement('div');
  afterWrap.className = 'cmp-pane cmp-after';
  const afterImg = document.createElement('img');
  const afterSrc = resolveImageAsset(cfg.after.src) || cfg.after.src;
  afterImg.src = afterSrc;
  afterImg.alt = cfg.after.alt || '';
  afterImg.loading = 'lazy';
  afterWrap.appendChild(afterImg);
  frame.appendChild(afterWrap);

  // RÃ³tulos (opcionais)
  if (cfg.beforeLabel) {
    const tag = document.createElement('span');
    tag.className = 'cmp-tag cmp-tag-before';
    tag.textContent = cfg.beforeLabel;
    frame.appendChild(tag);
  }
  if (cfg.afterLabel) {
    const tag = document.createElement('span');
    tag.className = 'cmp-tag cmp-tag-after';
    tag.textContent = cfg.afterLabel;
    frame.appendChild(tag);
  }

  // Guia/linha + alÃ§a
  const divider = document.createElement('div');
  divider.className = 'cmp-divider';
  frame.appendChild(divider);

  const handle = document.createElement('div');
  handle.className = 'cmp-handle';
  handle.setAttribute('role', 'slider');
  handle.setAttribute('tabindex', '0');
  handle.setAttribute('aria-label', 'Comparador antes/depois');
  handle.setAttribute('aria-valuemin', '0');
  handle.setAttribute('aria-valuemax', '100');
  handle.setAttribute('aria-valuenow', String(Math.round(value)));

  // Dica de acessibilidade (visÃ­vel sÃ³ para leitores, opcional)
  handle.setAttribute(
    'aria-description',
    'Use as setas do teclado para ajustar: Esquerda/Direita. Em telas de toque, arraste a alÃ§a.'
  );

  frame.appendChild(handle);

  // Legenda (opcional)
  if (cfg.caption) {
    const cap = document.createElement('figcaption');
    cap.className = 'cmp-caption';
    cap.textContent = cfg.caption;
    root.appendChild(cap);
  }

  // --- LÃ“GICA DE INTERAÃ‡ÃƒO ---
  let rect = null;
  let dragging = false;

  const getRect = () => frame.getBoundingClientRect();

  function setValueFromClientX(clientX) {
    rect = rect || getRect();
    const x = clientX - rect.left;
    const ratio = x / rect.width;
    value = posClamp(ratio * 100);
    frame.style.setProperty('--pos', `${value}%`);
    handle.setAttribute('aria-valuenow', String(Math.round(value)));
  }

  function onPointerDown(ev) {
    dragging = true;
    rect = getRect();
    frame.classList.add('is-dragging');
    setValueFromClientX(ev.clientX ?? ev.touches?.[0]?.clientX ?? 0);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  }

  function onPointerMove(ev) {
    if (!dragging) return;
    setValueFromClientX(ev.clientX ?? ev.touches?.[0]?.clientX ?? 0);
  }

  function onPointerUp() {
    dragging = false;
    frame.classList.remove('is-dragging');
    window.removeEventListener('pointermove', onPointerMove);
  }

  function onKeyDown(ev) {
    const step = ev.shiftKey ? 10 : 5;
    if (ev.key === 'ArrowLeft') {
      value = posClamp(value - step);
    } else if (ev.key === 'ArrowRight') {
      value = posClamp(value + step);
    } else if (ev.key === 'Home') {
      value = 0;
    } else if (ev.key === 'End') {
      value = 100;
    } else {
      return;
    }
    ev.preventDefault();
    frame.style.setProperty('--pos', `${value}%`);
    handle.setAttribute('aria-valuenow', String(Math.round(value)));
  }

  // Eventos
  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('keydown', onKeyDown);
  // Permite arrastar tocando em qualquer ponto (nÃ£o sÃ³ na alÃ§a)
  frame.addEventListener('pointerdown', (ev) => {
    if (ev.target !== handle) onPointerDown(ev);
  });

  // Atualiza quando redimensionar
  const ro = new ResizeObserver(() => {
    rect = getRect();
  });
  ro.observe(frame);

  /* dimensiona o frame respeitando o tamanho natural das imagens */
  const imageReady = (img) => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;

  const waitForImage = (img) => {
    if (imageReady(img)) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => resolve();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  };

  const applyNaturalSizing = () => {
    if (!imageReady(beforeImg) || !imageReady(afterImg)) return;

    const beforeWidth = beforeImg.naturalWidth || 0;
    const beforeHeight = beforeImg.naturalHeight || 0;
    const afterWidth = afterImg.naturalWidth || 0;
    const afterHeight = afterImg.naturalHeight || 0;

    if (!beforeWidth || !beforeHeight || !afterWidth || !afterHeight) return;

    const ratioBefore = beforeWidth / beforeHeight;
    const ratioAfter = afterWidth / afterHeight;
    let ratio = ratioBefore;

    if (Number.isFinite(ratioAfter) && ratioAfter > 0) {
      if (Math.abs(ratioAfter - ratioBefore) <= 0.01) {
        ratio = (ratioBefore + ratioAfter) / 2;
      } else {
        console.warn('CompareSliderElement: imagens com proporções distintas', {
          before: ratioBefore,
          after: ratioAfter,
        });
      }
    }

    const minHeight = Math.min(beforeHeight, afterHeight);
    const maxWidthByHeight = minHeight * ratio;
    const maxWidth = Math.min(beforeWidth, afterWidth, maxWidthByHeight);

    if (Number.isFinite(maxWidth) && maxWidth > 0) {
      frame.style.setProperty('--cmp-max-width', `${Math.round(maxWidth)}px`);
    }

    if (Number.isFinite(ratio) && ratio > 0) {
      const ratioValue = Math.round(ratio * 1000) / 1000;
      frame.style.setProperty('--cmp-aspect', `${ratioValue}`);
    }
  };

  Promise.all([waitForImage(beforeImg), waitForImage(afterImg)]).then(() => {
    applyNaturalSizing();
  });
  applyNaturalSizing();
  // Limpeza automÃ¡tica quando o elemento sair do DOM
  setupCleanup(root, () => {
    ro.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  });

  return root;
}





