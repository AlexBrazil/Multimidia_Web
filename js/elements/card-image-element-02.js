/**
 * card-image-element.js
 * Imagem em formato de "card" com bordas arredondadas/mask, legenda,
 * som de clique e abertura de modal (padrão) ou zoom.
 */

import { atualizarAlturaDoContainer, setupCleanup } from './base.js';

/** Converte "16/9" ou "4/3" em número (ex.: 1.777...) */
function parseAspectRatio(value) {
  if (!value) return null;
  if (typeof value === 'string' && value.includes('/')) {
    const [w, h] = value.split('/').map(Number);
    if (isFinite(w) && isFinite(h) && h !== 0) return w / h;
    return null;
  }
  const n = parseFloat(value);
  return isFinite(n) && n > 0 ? n : null;
}

/** Normaliza radius: aceita número em px, 'soft', 'pill', 'circle' */
function computeRadius(value) {
  if (value == null) return 12; // default "soft"
  if (typeof value === 'number') return value;
  const map = { soft: 12, pill: 9999, circle: 99999 };
  return map[String(value).toLowerCase()] ?? 12;
}

/** Normaliza sombra: 'none' | 'sm' | 'md' | 'lg' */
function shadowClass(value) {
  const v = String(value || 'sm').toLowerCase();
  return ['none', 'sm', 'md', 'lg'].includes(v) ? v : 'sm';
}

/** Cria e prepara tag <audio> para efeito de clique */
function prepararSomClique(cfg) {
  if (!cfg || !cfg.src) return null;
  // [ajuste] caminho padronizado para assets/audio
  const audio = new Audio(`assets/audio/${cfg.src}`);
  audio.volume = Math.min(1, Math.max(0, cfg.volume ?? 0.6));
  if (cfg.preload) audio.preload = cfg.preload; // 'metadata' (padrão), 'auto', 'none'
  return audio;
}

/**
 * Render principal
 * @param {Object} element - Objeto CardImageElement no data.json
 * @param {Function} abrirModalFn - função de abrir modal (do main.js / já usada por InfoBox)
 * @returns {HTMLElement} figure.card-image dentro de um wrap opcional
 */
export function criarCardImage(element, abrirModalFn) {
  const {
    source,
    title,
    alt,
    radius,
    useMask = true,
    borderWidth = 1,
    borderColor = '#ddd',
    shadow = 'sm',
    maxWidth = 0,
    aspectRatio = 'auto',
    caption,
    captionElement,
    clickSound,
    openBehavior = 'modal',
    modalTitle,
    modalElements,
    fullSizeSource,
    imageKey,
    captionKey,
    horizontalAlign,
    verticalAlign,
    fillHeight,

    // API antiga (já existente)
    interactionHint = false,             // boolean: exibir rótulo?
    interactionHintTextDesktop,          // string opcional (default: "clique para detalhes")
    interactionHintTextMobile,           // string opcional (default: "toque para detalhes")

    // [novo] API simplificada via objeto:
    // hint: { desktop: "clique para detalhes", mobile: "toque para detalhes", show?: true }
    hint
  } = element || {};

  // [novo] Mapeamento automático do objeto `hint` para os campos antigos
  let showHint = !!interactionHint;
  let hintDesktop = interactionHintTextDesktop;
  let hintMobile  = interactionHintTextMobile;

  if (typeof hint === 'object' && hint !== null) {
    // `hint.show` (opcional) habilita/força exibição; se não vier, exibir por padrão
    showHint = hint.show != null ? !!hint.show : true;
    if (typeof hint.desktop === 'string') hintDesktop = hint.desktop;
    if (typeof hint.mobile  === 'string') hintMobile  = hint.mobile;
  } else if (hint === true) {
    // se for booleano simples
    showHint = true;
  }

  // Verificações mínimas
  if (!source) {
    console.warn('[CardImageElement] "source" ausente.');
    return document.createComment('CardImageElement sem source');
  }

  // Wrapper externo (permite inserir rótulo acima do card)
  const wrap = document.createElement('div');
  wrap.className = 'card-image-wrap';

  // Cabeçalho/rótulo acima do card (nunca sobre a imagem)
  // [ajuste] agora dependente de `showHint`
  if (showHint) {
    const isNoHover =
      (window.matchMedia && window.matchMedia('(hover: none)').matches) ||
      ('ontouchstart' in window); // fallback simples

    const labelText = isNoHover
      ? (hintMobile || 'toque para detalhes')
      : (hintDesktop || 'clique para detalhes');

    const hintHeader = document.createElement('div');
    hintHeader.className = 'card-image-hint-header';
    hintHeader.setAttribute('role', 'note');
    hintHeader.textContent = labelText;
    wrap.appendChild(hintHeader);
  }

  // Container raiz (figure)
  const figure = document.createElement('figure');
  figure.className = 'card-image';
  if (imageKey) figure.dataset.imagekey = imageKey;

  // Wrapper visual do card (aplica radius, borda, sombra e máscara)
  const frame = document.createElement('div');
  frame.className = `card-image-frame sh-${shadowClass(shadow)}${useMask ? ' with-mask' : ''}`;
  frame.style.borderRadius = `${computeRadius(radius)}px`;
  frame.style.borderWidth = `${borderWidth}px`;
  frame.style.borderColor = borderColor;

  // Proporção e largura máx
  const ratio = parseAspectRatio(aspectRatio);
  if (ratio) frame.style.aspectRatio = String(ratio);
  if (maxWidth && Number(maxWidth) > 0) frame.style.maxWidth = `${Number(maxWidth)}px`;

  // Imagem
  const img = document.createElement('img');
  img.src = `assets/images/${source}`;
  img.alt = alt || title || '';
  if (title) img.title = title;
  img.decoding = 'async';
  img.loading = 'lazy';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.display = 'block';

  // Máscara suave nos cantos (não é sobreposição de texto)
  if (useMask) {
    img.style.maskImage = 'radial-gradient(#000 98%, transparent 100%)';
    img.style.webkitMaskImage = 'radial-gradient(#000 98%, transparent 100%)';
  }

  // Montagem
  frame.appendChild(img);
  figure.appendChild(frame);

  // Legenda (caption simples OU TextElement completo)
  if (captionElement && captionElement.type === 'TextElement') {
    const figcap = document.createElement('figcaption');
    figcap.className = 'card-image-caption';
    if (captionKey) figcap.dataset.captionkey = captionKey;

    const p = document.createElement('p');
    p.className = `text-element ${captionElement.styleName || 'caption'}`;
    if (captionElement.textKey) p.dataset.textkey = captionElement.textKey;
    p.textContent = captionElement.text ?? '';
    figcap.appendChild(p);
    figure.appendChild(figcap);
  } else if (caption) {
    const figcap = document.createElement('figcaption');
    figcap.className = 'card-image-caption';
    if (captionKey) figcap.dataset.captionkey = captionKey;
    figcap.textContent = caption;
    figure.appendChild(figcap);
  }

  // Interatividade
  const clicavel = openBehavior !== 'none';
  if (clicavel) {
    frame.tabIndex = 0;
    frame.setAttribute('role', 'button');
    frame.setAttribute('aria-label', title || alt || 'Abrir imagem');
    frame.classList.add('is-interactive');
  }

  const clickFx = prepararSomClique(clickSound);

  // Ação de clique / tecla
  const handleActivate = () => {
    if (clickFx) {
      try { clickFx.currentTime = 0; clickFx.play().catch(() => {}); } catch {}
    }

    if (openBehavior === 'modal') {
      const modalPayload = {
        type: 'InfoBoxElement',
        title: modalTitle || title || 'Detalhes',
        elements: Array.isArray(modalElements) && modalElements.length
          ? modalElements
          : [
              { type: 'ImageElement', title: title || alt || '', source: fullSizeSource || source, legend: '' }
            ]
      };
      abrirModalFn?.(modalPayload);
    } else if (openBehavior === 'zoom') {
      const full = fullSizeSource || source;
      const modalPayload = {
        type: 'InfoBoxElement',
        title: title || alt || 'Visualização',
        elements: [ { type: 'ImageElement', title: title || '', source: full, legend: '' } ]
      };
      abrirModalFn?.(modalPayload);
    }
  };

  if (clicavel) {
    frame.addEventListener('click', handleActivate);
    frame.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        handleActivate();
      }
    });
  }

  // Atualiza altura do container após carregar imagem
  const onLoad = () => requestAnimationFrame(() => atualizarAlturaDoContainer());
  img.addEventListener('load', onLoad, { once: true });

  // Cleanup
  setupCleanup(figure, () => {
    img.removeEventListener('load', onLoad);
    if (clickFx) { try { clickFx.pause(); } catch {} }
  });

  // Retorna figure dentro do wrapper (com rótulo acima se habilitado)
  wrap.appendChild(figure);

  // Ajuste visual inicial
  requestAnimationFrame(() => atualizarAlturaDoContainer());

  return wrap;
}
