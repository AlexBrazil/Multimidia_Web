#!/usr/bin/env node
/**
 * Migra todos os InfoBoxElement para anchorMode: "flow-end"
 * - remove x, y
 * - define triggerContent por slide: "<span>i</span>" para 1 único, "<span>1</span>", "<span>2</span>"... para 2+
 * - preserva elements internos e as chaves: mode, verticalAlign, horizontalAlign, type, title
 *
 * Uso:
 *   node migrar-infobox.js data.json data.migrado.json
 *   node migrar-infobox.js data.json data.migrado.json --only=14,1889,10
 */
const fs = require('fs');
const path = require('path');

const [, , inPath, outPath, ...args] = process.argv;
if (!inPath || !outPath) {
  console.error('Uso: node migrar-infobox.js <entrada.json> <saida.json> [--only=1,2,3]');
  process.exit(1);
}

const onlyArg = args.find(a => a.startsWith('--only='));
const onlyIds = onlyArg
  ? new Set(onlyArg.replace('--only=', '').split(',').map(s => s.trim()).filter(Boolean))
  : null;

function isSlide(node) { return node && node.type === 'Slide'; }
function isInfoBox(node) { return node && node.type === 'InfoBoxElement'; }

function walkAny(node, fn) {
  if (!node || typeof node !== 'object') return;
  fn(node);
  if (Array.isArray(node.items)) node.items.forEach(n => walkAny(n, fn));
  if (Array.isArray(node.elements)) node.elements.forEach(n => walkAny(n, fn));
}

function collectSlides(root) {
  const slides = [];
  walkAny(root, n => { if (isSlide(n)) slides.push(n); });
  return slides;
}

function collectInfoBoxesInOrder(node, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (Array.isArray(node.elements)) {
    for (const child of node.elements) {
      if (isInfoBox(child)) acc.push(child);
      collectInfoBoxesInOrder(child, acc);
    }
  }
  if (Array.isArray(node.items)) {
    for (const child of node.items) collectInfoBoxesInOrder(child, acc);
  }
  return acc;
}

function migrateInfoBox(ibox) {
  // Sempre força flow-end
  ibox.anchorMode = 'flow-end';

  // Remove coords se existirem
  if ('x' in ibox) delete ibox.x;
  if ('y' in ibox) delete ibox.y;

  // NÃO alterar: elements, mode, verticalAlign, horizontalAlign, type, title
}

function ensureTriggerContent(slide) {
  const infoboxes = collectInfoBoxesInOrder(slide).filter(isInfoBox);
  if (infoboxes.length === 0) return;

  if (infoboxes.length === 1) {
    const ib = infoboxes[0];
    if (!('triggerContent' in ib) || String(ib.triggerContent).trim() === '') {
      ib.triggerContent = '<span>i</span>';
    }
  } else {
    infoboxes.forEach((ib, idx) => {
      if (!('triggerContent' in ib) || String(ib.triggerContent).trim() === '') {
        ib.triggerContent = `<span>${idx + 1}</span>`;
      }
    });
  }
}

function migrate(root) {
  const slides = collectSlides(root);
  for (const slide of slides) {
    if (onlyIds && !onlyIds.has(String(slide.id))) continue;

    // 1) migra cada infobox
    walkAny(slide, node => {
      if (isInfoBox(node)) migrateInfoBox(node);
    });

    // 2) cria triggerContent conforme regra
    ensureTriggerContent(slide);
  }
  return root;
}

function main() {
  const raw = fs.readFileSync(path.resolve(inPath), 'utf8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    console.error('JSON inválido:', e.message);
    process.exit(1);
  }

  const migrated = migrate(json);

  fs.writeFileSync(path.resolve(outPath), JSON.stringify(migrated, null, 2), 'utf8');
  console.log('OK! Gerado:', outPath);
}
main();
