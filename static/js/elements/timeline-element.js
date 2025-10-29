/**
 * timeline-element.js
 * Elemento de ÔÇ£linha do tempoÔÇØ com itens expans├¡veis, acess├¡vel e responsivo.
 *
 * Uso no data.json (exemplo):
 * {
 *   "type": "TimelineElement",
 *   "title": "Evolu├º├úo do Cinto de Seguran├ºa",
 *   "items": [
 *     {
 *       "label": "1959",
 *       "sub": "Volvo patenteia o cinto de 3 pontos",
 *       "html": "<p>Marco de seguran├ºa veicular.</p>",
 *       "defaultOpen": true,
 *       "icon": "assets/images/seatbelt-1959.svg"
 *     },
 *     {
 *       "label": "1980s",
 *       "sub": "Campanhas massivas",
 *       "html": "<ul><li>Ado├º├úo ampla</li><li>Leis espec├¡ficas</li></ul>"
 *     }
 *   ],
 *   "options": {
 *     "dense": false,          // itens mais compactos
 *     "accordion": false,      // se true, abre um por vez
 *     "numbered": false        // mostra numera├º├úo dos eventos
 *   }
 * }
 */

import {
  atualizarAlturaDoContainer,
  setupCleanup,
} from './base.js';
import { resolveImageAsset } from '../utils/asset-path.js';

const ALLOWED_ORIENTATIONS = new Set(['vertical', 'horizontal', 'auto']);

function resolveOrientation(value) {
  if (typeof value !== 'string') return 'vertical';
  const normalized = value.trim().toLowerCase();
  return ALLOWED_ORIENTATIONS.has(normalized) ? normalized : 'vertical';
}

/** Util: cria elemento com classes e attrs */
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

/** Anexa listeners para m├¡dias recalcularem layout quando carregarem */
function watchMediaForResize(root) {
  const medias = root.querySelectorAll('img, video, iframe, audio');
  medias.forEach((m) => {
    // imagens
    if ('complete' in m) {
      if (!m.complete) {
        m.addEventListener('load', () => atualizarAlturaDoContainer(), { once: true });
      }
    }
    // v├¡deo/├íudio
    m.addEventListener('loadedmetadata', () => atualizarAlturaDoContainer(), { once: true });
    m.addEventListener('loadeddata', () => atualizarAlturaDoContainer(), { once: true });
  });
}

/** Gera um id ├║nico previs├¡vel */
let _uid = 0;
function uid(prefix = 'tl') {
  _uid += 1;
  return `${prefix}-${Date.now().toString(36)}-${_uid}`;
}

/** Alterna um item e opcionalmente fecha os demais (modo acordeon) */
function toggleItem($item, open, { accordion, listRoot }) {
  const $btn = $item.querySelector('.timeline-head');
  const $body = $item.querySelector('.timeline-body');

  const willOpen = open ?? $body.hidden; // se open ├® undefined, inverte
  if (willOpen && accordion && listRoot) {
    listRoot.querySelectorAll('.timeline-item').forEach((it) => {
      if (it !== $item) {
        const b = it.querySelector('.timeline-body');
        const h = it.querySelector('.timeline-head');
        if (b && !b.hidden) {
          b.hidden = true;
          it.classList.remove('is-open');
          if (h) h.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }

  $body.hidden = !willOpen;
  $item.classList.toggle('is-open', willOpen);
  if ($btn) $btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');

  // Ajusta altura p├│s-transition
  requestAnimationFrame(() => atualizarAlturaDoContainer());
}

/** Cria um item da timeline */
function createItem(item = {}, index, ctx) {
  const { numbered } = ctx.options;
  const itemId = uid('timeline-item');

  const $li = el('li', { className: 'timeline-item' });

  // trilho + ponto
  const $rail = el('div', { className: 'timeline-rail', attrs: { 'aria-hidden': 'true' } });
  const $dot = el('span', { className: 'timeline-dot' });

  if (item.icon) {
    const iconSrc = resolveImageAsset(item.icon) || item.icon;
    const $ic = el('img', {
      className: 'timeline-icon',
      attrs: { src: iconSrc, alt: '' },
    });
    $rail.appendChild($ic);
  }

  $rail.appendChild($dot);
  $li.appendChild($rail);

  const labelText = numbered ? `${index + 1}. ${item.label || ''}` : (item.label || '');
  const secondaryText = item.sub || item.title || '';

  const $head = document.createElement('button');
  $head.type = 'button';
  $head.className = 'timeline-head';
  $head.id = `${itemId}-head`;
  $head.setAttribute('aria-controls', `${itemId}-body`);
  $head.setAttribute('aria-expanded', item.defaultOpen ? 'true' : 'false');

  const $label = document.createElement('span');
  $label.className = 'timeline-label';
  $label.textContent = labelText || `Evento ${index + 1}`;
  $head.appendChild($label);

  if (secondaryText) {
    const $sub = document.createElement('span');
    $sub.className = 'timeline-sub';
    $sub.textContent = secondaryText;
    $head.appendChild($sub);
  }

  const $chevron = document.createElement('span');
  $chevron.className = 'timeline-chevron';
  $chevron.setAttribute('aria-hidden', 'true');
  $chevron.textContent = '?';
  $head.appendChild($chevron);

  const $body = document.createElement('div');
  $body.className = 'timeline-body';
  $body.id = `${itemId}-body`;
  $body.setAttribute('role', 'region');
  $body.setAttribute('aria-labelledby', `${itemId}-head`);

  if (item.html) {
    $body.innerHTML = item.html;
  } else {
    if (item.media) {
      const figure = document.createElement('figure');
      figure.className = 'timeline-media';
      const img = document.createElement('img');
      const mediaSrc = resolveImageAsset(item.media) || item.media;
      img.src = mediaSrc;
      img.alt = item.alt || '';
      figure.appendChild(img);
      $body.appendChild(figure);
    }

    if (item.description) {
      const desc = document.createElement('p');
      desc.className = 'timeline-description';
      desc.textContent = item.description;
      $body.appendChild(desc);
    }
  }

  const hasContent = item.html || $body.childElementCount > 0;
  if (!hasContent) {
    $body.hidden = true;
    $head.disabled = true;
    $head.classList.add('timeline-head--static');
    $head.setAttribute('aria-expanded', 'false');
    $head.setAttribute('aria-disabled', 'true');
  } else {
    $body.hidden = !(item.defaultOpen === true);
    if (item.defaultOpen) $li.classList.add('is-open');
    $head.addEventListener('click', () => toggleItem($li, undefined, ctx));
  }

  $li.appendChild($head);
  $li.appendChild($body);

  watchMediaForResize($body);

  return $li;
}


/**
 * API p├║blica ÔÇö criar Timeline
 * @param {Object} cfg
 * @param {String} [cfg.title]
 * @param {Array}  [cfg.items]
 * @param {Object} [cfg.options] { dense, accordion, numbered }
 * @returns {HTMLElement}
 */
export function criarTimeline(cfg = {}) {
  const opts = {
    dense: false,
    accordion: false,
    numbered: false,
    ...(cfg.options || {}),
  };

  const $section = el('section', {
    className: `timeline-element${opts.dense ? ' timeline--dense' : ''}`,
    attrs: { role: 'group' },
  });
  const orientation = resolveOrientation(cfg.orientation);
  $section.dataset.orientation = orientation;

  // T├¡tulo opcional
  if (cfg.title) {
    const $h = el('h3', { className: 'timeline-title' });
    $h.textContent = cfg.title;
    $section.appendChild($h);
  }

  // Lista de eventos
  const $list = el('ol', { className: 'timeline-list' });
  $list.dataset.orientation = orientation;
  const ctx = { options: opts, listRoot: $list };

  (cfg.items || []).forEach((item, i) => {
    const $item = createItem(item || {}, i, ctx);
    $list.appendChild($item);
  });

  // Observa mudan├ºas de tamanho do bloco da timeline
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => atualizarAlturaDoContainer());
    ro.observe($list);
    ro.observe($section);
    setupCleanup($section, () => ro.disconnect());
  }

  // Recalcula altura ap├│s inserir no DOM
  requestAnimationFrame(() => atualizarAlturaDoContainer());

  $section.appendChild($list);
  return $section;
}

export { criarTimeline as default };
