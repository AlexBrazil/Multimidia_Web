(function(){
  const els = {
    source: document.getElementById('source'),
    fullSizeSource: document.getElementById('fullSizeSource'),
    title: document.getElementById('title'),
    alt: document.getElementById('alt'),
    aspectRatio: document.getElementById('aspectRatio'),
    maxWidth: document.getElementById('maxWidth'),
    radius: document.getElementById('radius'),
    borderWidth: document.getElementById('borderWidth'),
    borderColor: document.getElementById('borderColor'),
    shadow: document.getElementById('shadow'),
    useMask: document.getElementById('useMask'),
    openBehavior: document.getElementById('openBehavior'),

    caption: document.getElementById('caption'),
    captionStyle: document.getElementById('captionStyle'),
    captionText: document.getElementById('captionText'),

    modalTitle: document.getElementById('modalTitle'),
    modalElements: document.getElementById('modalElements'),

    interactionHint: document.getElementById('interactionHint'),
    hintDesktop: document.getElementById('hintDesktop'),
    hintMobile: document.getElementById('hintMobile'),

    showInfoBadge: document.getElementById('showInfoBadge'),
    badgePosition: document.getElementById('badgePosition'),
    clickSound: document.getElementById('clickSound'),

    gen: document.getElementById('gen'),
    copy: document.getElementById('copy'),
    download: document.getElementById('download'),
    reset: document.getElementById('reset'),
    out: document.getElementById('out')
  };

  function parseJSONSafe(txt, fallback){
    try { return txt ? JSON.parse(txt) : fallback; } catch { return fallback; }
  }

  function buildJSON(){
    const obj = {
      type: 'CardImageElement',
      source: (els.source.value||'').trim(),
      title: (els.title.value||'').trim() || undefined,
      alt: (els.alt.value||'').trim() || undefined,
      radius: parseRadius(els.radius.value),
      useMask: !!els.useMask.checked,
      borderWidth: clampNum(els.borderWidth.value, 0),
      borderColor: (els.borderColor.value||'').trim() || undefined,
      shadow: (els.shadow.value||'sm'),
      maxWidth: clampNum(els.maxWidth.value, 0),
      aspectRatio: normalizeAspect(els.aspectRatio.value),
      caption: (els.captionText.value ? undefined : (els.caption.value||'').trim() || undefined),
      captionElement: (els.captionText.value ? {
        type: 'TextElement',
        styleName: (els.captionStyle.value||'caption').trim() || 'caption',
        text: els.captionText.value
      } : undefined),
      openBehavior: els.openBehavior.value,
      modalTitle: (els.modalTitle.value||'').trim() || undefined,
      modalElements: parseJSONSafe(els.modalElements.value, undefined),
      fullSizeSource: (els.fullSizeSource.value||'').trim() || undefined,
      interactionHint: !!els.interactionHint.checked || undefined,
      interactionHintTextDesktop: (els.hintDesktop.value||'').trim() || undefined,
      interactionHintTextMobile: (els.hintMobile.value||'').trim() || undefined,
      showInfoBadge: !!els.showInfoBadge.checked,
      badgePosition: els.badgePosition.value || 'top-right',
      clickSound: parseJSONSafe(els.clickSound.value, undefined)
    };

    // remove undefined
    Object.keys(obj).forEach(k => obj[k] === undefined && delete obj[k]);

    // valida obrigatório
    if (!obj.source){
      toast('"source" é obrigatório.');
      return null;
    }

    els.out.textContent = JSON.stringify(obj, null, 2);
    return obj;
  }

  function clampNum(v, min){
    const n = Number(v);
    return Number.isFinite(n) && n >= min ? n : 0;
  }
  function parseRadius(v){
    const s = (v||'').trim();
    if (!s) return undefined;
    const map = { soft: 'soft', pill: 'pill', circle: 'circle' };
    if (map[s]) return map[s];
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  }
  function normalizeAspect(v){
    const s = (v||'').trim();
    if (!s) return undefined;
    return s; // aceita '16/9', '4/3' ou número como string; renderer faz o parse
  }

  function copyJSON(){
    const txt = els.out.textContent.trim();
    if (!txt || txt.startsWith('{/*')) return toast('Gere o JSON primeiro.');
    navigator.clipboard.writeText(txt).then(() => toast('JSON copiado!'));
  }
  function downloadJSON(){
    const txt = els.out.textContent.trim();
    if (!txt || txt.startsWith('{/*')) return toast('Gere o JSON primeiro.');
    const blob = new Blob([txt], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'CardImageElement.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function resetAll(){
    document.querySelector('form')?.reset?.();
    ['source','fullSizeSource','title','alt','aspectRatio','maxWidth','radius','borderWidth','borderColor','caption','captionStyle','captionText','modalTitle','modalElements','hintDesktop','hintMobile','clickSound'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('useMask').checked = true;
    document.getElementById('showInfoBadge').checked = true;
    document.getElementById('shadow').value = 'sm';
    document.getElementById('openBehavior').value = 'modal';
    document.getElementById('badgePosition').value = 'top-right';
    els.out.textContent = '{/* clique em "Gerar JSON" */}';
    toast('Campos resetados.');
  }
  function toast(msg){
    const el = document.createElement('div');
    el.textContent = msg;
    el.className = 'toast';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  // Listeners
  document.getElementById('gen').addEventListener('click', (e) => { e.preventDefault(); buildJSON(); });
  document.getElementById('copy').addEventListener('click', (e) => { e.preventDefault(); copyJSON(); });
  document.getElementById('download').addEventListener('click', (e) => { e.preventDefault(); downloadJSON(); });
  document.getElementById('reset').addEventListener('click', (e) => { e.preventDefault(); resetAll(); });
})();

