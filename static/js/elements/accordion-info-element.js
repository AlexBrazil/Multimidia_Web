/**
 * accordion-info-element.js
 * AcordeÃ£o de informaÃ§Ãµes, acessÃ­vel e responsivo.
 *
 * Exemplo no data.json:
 * {
 *   "type": "AccordionInfoElement",
 *   "title": "Perguntas frequentes",
 *   "items": [
 *     {
 *       "title": "O que Ã© o curso?",
 *       "html": "<p>Um curso interativo com avaliaÃ§Ãµes.</p>",
 *       "icon": "assets/icons/info.svg",   // opcional (pode ser emoji "ðŸ’¡")
 *       "defaultOpen": true                 // opcional
 *     },
 *     {
 *       "title": "Como acessar?",
 *       "html": "<ul><li>Via login</li><li>Suporte WhatsApp</li></ul>"
 *     }
 *   ],
 *   "options": {
 *     "accordion": true,   // abre um por vez (default: true)
 *     "dense": false,      // itens mais compactos
 *     "numbered": false    // prefixa nÃºmeros nos tÃ­tulos
 *   }
 * }
 */

import {
  atualizarAlturaDoContainer,
  setupCleanup,
} from './base.js';
import { resolveImageAsset } from '../utils/asset-path.js';

/* util: cria elemento com classes/atributos */
function el(tag, { className = '', attrs = {}, html = '' } = {}) {
  const $ = document.createElement(tag);
  if (className) $.className = className;
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    $.setAttribute(k, String(v));
  }
  if (html) $.innerHTML = html;
  return $;
}

/* observar mÃ­dias para recalcular layout */
function watchMediaForResize(root) {
  const medias = root.querySelectorAll('img, video, iframe, audio');
  medias.forEach((m) => {
    if ('complete' in m) {
      if (!m.complete) {
        m.addEventListener('load', () => atualizarAlturaDoContainer(), { once: true });
      }
    }
    m.addEventListener('loadedmetadata', () => atualizarAlturaDoContainer(), { once: true });
    m.addEventListener('loadeddata', () => atualizarAlturaDoContainer(), { once: true });
  });
}

/* id Ãºnico simples */
let _uid = 0;
function uid(prefix = 'acc') {
  _uid += 1;
  return `${prefix}-${Date.now().toString(36)}-${_uid}`;
}

/* decide se â€œiconâ€ Ã© emoji/texto ou imagem */
function makeIcon(icon) {
  if (!icon) return null;
  const looksLikePath = /[./]/.test(icon); // tem "/" ou "." â†’ provavelmente arquivo
  if (looksLikePath) {
    const resolvedSrc = resolveImageAsset(icon) || icon;
    return el('img', {
      className: 'acc-icon',
      attrs: { src: resolvedSrc, alt: '' },
    });
  }
  // caso contrÃ¡rio, trata como emoji/texto
  const span = el('span', { className: 'acc-emoji', attrs: { 'aria-hidden': 'true' } });
  span.textContent = icon;
  return span;
}

/* alterna painel (e fecha outros se for accordion) */
function toggleItem($item, desiredOpen, ctx) {
  const $btn = $item.querySelector('.acc-head');
  const $panel = $item.querySelector('.acc-panel');

  const shouldOpen = desiredOpen ?? $panel.hidden;
  if (shouldOpen && ctx.options.accordion && ctx.listRoot) {
    ctx.listRoot.querySelectorAll('.acc-item').forEach((it) => {
      if (it !== $item) {
        const p = it.querySelector('.acc-panel');
        const b = it.querySelector('.acc-head');
        if (p && !p.hidden) {
          p.hidden = true;
          it.classList.remove('is-open');
          if (b) b.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }

  $panel.hidden = !shouldOpen;
  $item.classList.toggle('is-open', shouldOpen);
  if ($btn) $btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');

  requestAnimationFrame(() => atualizarAlturaDoContainer());
}

/* cria item do acordeÃ£o */
function createItem(item, index, ctx) {
  const id = uid('acc');
  const $li = el('li', { className: 'acc-item' });

  // CabeÃ§alho acessÃ­vel
  const titleText = ctx.options.numbered ? `${index + 1}. ${item.title || ''}` : (item.title || '');
  const $head = el('button', {
    className: 'acc-head',
    attrs: {
      id: `${id}-head`,
      type: 'button',
      'aria-expanded': item.defaultOpen ? 'true' : 'false',
      'aria-controls': `${id}-panel`,
    },
    html: `
      <span class="acc-left">
        ${item.icon ? '<span class="acc-ico-slot"></span>' : ''}
        <span class="acc-title">${titleText}</span>
      </span>
      <span class="acc-chevron" aria-hidden="true">â–¾</span>
    `,
  });

  if (item.icon) {
    const $icoSlot = $head.querySelector('.acc-ico-slot');
    const $ico = makeIcon(item.icon);
    if ($icoSlot && $ico) $icoSlot.appendChild($ico);
  }

  // Painel expansÃ­vel
  const $panel = el('div', {
    className: 'acc-panel',
    attrs: { id: `${id}-panel`, role: 'region', 'aria-labelledby': `${id}-head` },
    html: item.html || '',
  });
  $panel.hidden = !(item.defaultOpen === true);
  watchMediaForResize($panel);

  // Eventos
  $head.addEventListener('click', () => toggleItem($li, undefined, ctx));

  // Estado inicial
  if (item.defaultOpen) $li.classList.add('is-open');

  $li.appendChild($head);
  $li.appendChild($panel);
  return $li;
}

/**
 * API pÃºblica â€” criar acordeÃ£o
 * @param {Object} cfg
 * @param {String} [cfg.title]
 * @param {Array}  [cfg.items]
 * @param {Object} [cfg.options] { accordion, dense, numbered }
 * @returns {HTMLElement}
 */
export function criarAccordionInfo(cfg = {}) {
  const options = {
    accordion: true,
    dense: false,
    numbered: false,
    ...(cfg.options || {}),
  };

  const rootClass = `accordion-info${options.dense ? ' accordion--dense' : ''}`;
  const $section = el('section', { className: rootClass, attrs: { role: 'group' } });

  if (cfg.title) {
    const $h = el('h3', { className: 'acc-section-title' });
    $h.textContent = cfg.title;
    $section.appendChild($h);
  }

  const $list = el('ul', { className: 'acc-list' });
  const ctx = { options, listRoot: $list };

  (cfg.items || []).forEach((it, i) => {
    const $item = createItem(it || {}, i, ctx);
    $list.appendChild($item);
  });

  // Observa mudanÃ§as de tamanho para manter layout consistente
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => atualizarAlturaDoContainer());
    ro.observe($list);
    ro.observe($section);
    setupCleanup($section, () => ro.disconnect());
  }

  requestAnimationFrame(() => atualizarAlturaDoContainer());
  $section.appendChild($list);
  return $section;
}

export { criarAccordionInfo as default };



