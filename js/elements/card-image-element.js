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
  // caminho padronizado para assets/audio
  const audio = new Audio(`assets/audio/${cfg.src}`);
  audio.volume = Math.min(1, Math.max(0, cfg.volume ?? 0.6));
  if (cfg.preload) audio.preload = cfg.preload; // 'metadata' (padrão), 'auto', 'none'
  return audio;
}

/** Retorna true quando o card abre MODAL com conteúdo extra real */
function hasModalInfo(openBehavior, modalElements) {
  if (openBehavior !== 'modal') return false;
  if (!Array.isArray(modalElements)) return false;
  // considera que existe “info” se houver ao menos 1 elemento que não seja imagem de zoom simples
  return modalElements.length > 0;
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

    // Cabeçalho superior (fora da imagem)
    interactionHint = false,             // boolean: exibir rótulo acima?
    interactionHintTextDesktop,          // string opcional (default: "clique para detalhes")
    interactionHintTextMobile,           // string opcional (default: "toque para detalhes")

    // NOVO: controle do badge “i” no canto quando há conteúdo extra na modal
    showInfoBadge = true,                // se false, nunca mostra badge
    badgePosition = 'top-right'          // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  } = element || {};

  // Verificações mínimas
  if (!source) {
    console.warn('[CardImageElement] "source" ausente.');
    return document.createComment('CardImageElement sem source');
  }

  // wrapper externo que permite um cabeçalho acima do card
  const wrap = document.createElement('div');
  wrap.className = 'card-image-wrap';

  // Cabeçalho/rótulo opcional acima do card (nunca sobre a imagem)
  if (interactionHint) {
    const isNoHover =
      (window.matchMedia && window.matchMedia('(hover: none)').matches) ||
      ('ontouchstart' in window); // fallback simples

    const labelText = isNoHover
      ? (interactionHintTextMobile || 'toque para detalhes')
      : (interactionHintTextDesktop || 'clique para detalhes');

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

  // Proporção
  const ratio = parseAspectRatio(aspectRatio);
  if (ratio) {
    frame.style.aspectRatio = String(ratio); // browsers modernos
  }
  if (maxWidth && Number(maxWidth) > 0) {
    frame.style.maxWidth = `${Number(maxWidth)}px`;
  }

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

  // Máscara suave (não é sobreposição de texto)
  if (useMask) {
    img.style.maskImage = 'radial-gradient(#000 98%, transparent 100%)';
    img.style.webkitMaskImage = 'radial-gradient(#000 98%, transparent 100%)';
  }

  // Montagem da imagem
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

  // Acessibilidade e interação: torna clicável se não for "none"
  const clicavel = openBehavior !== 'none';
  if (clicavel) {
    frame.tabIndex = 0;
    frame.setAttribute('role', 'button');
    frame.setAttribute('aria-label', title || alt || 'Abrir imagem');
    frame.classList.add('is-interactive');
  }

  // >>> NOVO: badge de “info extra” quando a ação é modal com conteúdo <<<
  const mostraBadge = showInfoBadge && hasModalInfo(openBehavior, modalElements);
  if (mostraBadge) {
    frame.classList.add('has-modal'); // hook de CSS
    frame.dataset.hasModal = 'true';  // útil para testes
    const badge = document.createElement('span');
    badge.className = `card-image-badge ${badgePosition}`;
    badge.setAttribute('aria-hidden', 'true');
    badge.title = 'Este card abre informações extras';
    // visual simples e leve; você pode trocar por SVG se quiser
    badge.textContent = 'i';
    frame.appendChild(badge);
  }
  // <<< FIM DO NOVO BADGE >>>

  const clickFx = prepararSomClique(clickSound);

  // Ação de clique / tecla
  const handleActivate = () => {
    if (clickFx) {
      try { clickFx.currentTime = 0; clickFx.play().catch(() => {}); } catch {}
    }

    if (openBehavior === 'modal') {
      // Monta um "element" sintético no formato que o abrirModalFn entende (como InfoBox)
      const modalPayload = {
        type: 'InfoBoxElement',
        title: modalTitle || title || 'Detalhes',
        elements: Array.isArray(modalElements) && modalElements.length
          ? modalElements
          : [
              // Fallback: mostra a própria imagem em grande
              {
                type: 'ImageElement',
                title: title || alt || '',
                source: fullSizeSource || source,
                legend: ''
              }
            ]
      };
      abrirModalFn?.(modalPayload);
    } else if (openBehavior === 'zoom') {
      const full = fullSizeSource || source;
      const modalPayload = {
        type: 'InfoBoxElement',
        title: title || alt || 'Visualização',
        elements: [
          { type: 'ImageElement', title: title || '', source: full, legend: '' }
        ]
      };
      abrirModalFn?.(modalPayload);
    } else {
      // none -> nada
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

  // retorna o figure dentro do wrapper (com rótulo acima, se habilitado)
  wrap.appendChild(figure);

  // Ajuste visual inicial
  requestAnimationFrame(() => atualizarAlturaDoContainer());

  return wrap;
}
