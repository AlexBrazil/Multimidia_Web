/**
 * text-element.js
 * Renderiza títulos, parágrafos e qualquer TextElement.
 * Suporta data-textkey estável para ancoragem via CSS selector.
 */

import { atualizarAlturaDoContainer } from './base.js';

/** Slug estável para usar como chave quando o autor não define textKey explicitamente. */
function toSlugStable(input) {
  if (!input) return '';
  const noAccents = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return noAccents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/** Resolve a chave estável (data-textkey). */
function resolveTextKey(element) {
  if (typeof element.textKey === 'string' && element.textKey.trim()) {
    return element.textKey.trim();
  }
  if (typeof element.text === 'string' && element.text.trim()) {
    return toSlugStable(element.text);
  }
  return '';
}

/**
 * Cria o elemento de texto conforme o styleName informado.
 * Mantém compatibilidade com o CSS atual (usa <p> + classes).
 *
 * @param {Object} element
 *  {
 *    "type": "TextElement",
 *    "styleName": "title1" | "title2" | "paragraph" | "caption" | ...,
 *    "text": "Conteúdo",
 *    "textKey": "excecoes" // (opcional) chave estável para seletores
 *  }
 */
export function criarTexto(element) {
  const styleName = element.styleName || 'paragraph';
  const rawText = typeof element.text === 'string' ? element.text : '';

  // Compatível com seu CSS: tudo continua <p> com classes
  const el = document.createElement('p');
  el.className = `text-element ${styleName}`;
  el.textContent = rawText;

  // Metadados para ancoragem / inspeção (não mudam aparência):
  el.dataset.rawtext = rawText;

  const textKey = resolveTextKey(element);
  if (textKey) {
    el.dataset.textkey = textKey;             // <p ... data-textkey="excecoes">
    // Opcional: se quiser IDs previsíveis no futuro:
    // if (!el.id) el.id = `text-${textKey}`;
  }

  requestAnimationFrame(() => atualizarAlturaDoContainer());
  return el;
}
