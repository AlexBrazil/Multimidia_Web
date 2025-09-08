/**
 * base.js
 * Utilitários compartilhados entre todos os elementos do slide.
 * Centraliza funcionalidades comuns para evitar duplicação.
 */

// --- ELEMENTOS DA DOM (compartilhados) ---
const container = document.getElementById('slide-elements-container');

// --- SCROLL INDICATOR (sistema compartilhado) ---
let scrollIndicator = null;

/**
 * Cria o botão scroll indicador e o insere no container
 * @returns {HTMLButtonElement}
 */
export function criarScrollIndicator() {
    // Retorna o mesmo indicador se já estiver no DOM
    if (scrollIndicator && scrollIndicator.isConnected) {
        return scrollIndicator;
    }
    
    // Cria o botão
    scrollIndicator = document.createElement('button');
    scrollIndicator.id = 'scroll-indicator';
    scrollIndicator.className = '';
    scrollIndicator.setAttribute('aria-label', 'Rolar para baixo');
    scrollIndicator.setAttribute('title', 'Há mais conteúdo abaixo');
    scrollIndicator.style.display = 'none';
    
    // [MOD] – Anexa o botão ao contêiner estático (conteúdo principal)
    // para que ele não role junto com #slide-elements-container.
    const wrapper = document.getElementById('conteudo-principal');
    if (wrapper) {
        // Garante que o wrapper seja a referência para posicionamento absoluto
        const wrapperStyle = getComputedStyle(wrapper);
        if (wrapperStyle.position === 'static') {
            wrapper.style.position = 'relative';
        }
        wrapper.appendChild(scrollIndicator);
    }

    // [MOD] – Função para atualizar a posição vertical do indicador
    // com base na altura do rodapé. Isso evita que o botão cubra o footer.
    function atualizarPosicao() {
        const footer = document.getElementById('slide-footer');
        const footerHeight = footer
            ? footer.getBoundingClientRect().height
            : 0;
        // Adiciona 20px de espaço acima do rodapé
        scrollIndicator.style.bottom = `${footerHeight + 20}px`;
    }
    
    // Chamada inicial da função
    atualizarPosicao();

    // [MOD] – Observa alterações no rodapé e na janela para recalcular a posição
    const footer = document.getElementById('slide-footer');
    const resizeObs = new ResizeObserver(() => atualizarPosicao());
    if (footer) {
        resizeObs.observe(footer);
    }
    window.addEventListener('resize', atualizarPosicao);

    // Registra limpeza quando o indicador é removido do DOM
    // (evita vazamento de listeners/observadores).
    setupCleanup(scrollIndicator, () => {
        resizeObs.disconnect();
        window.removeEventListener('resize', atualizarPosicao);
    });

    // Event listeners para acionar a rolagem ao clicar ou apertar Enter/Espaço
    scrollIndicator.addEventListener('click', scrollToNext);
    scrollIndicator.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            scrollToNext();
        }
    });

    return scrollIndicator;
}


/**
 * Verifica se há conteúdo para rolar e controla a visibilidade da seta
 */
export function atualizarIndicadorScroll() {
    if (!container || !scrollIndicator || !scrollIndicator.isConnected) return;
    
    const hasScrollableContent = container.scrollHeight > container.clientHeight;
    const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    
    if (hasScrollableContent && !isNearBottom) {
        scrollIndicator.style.display = 'block';
        scrollIndicator.classList.add('pulsing');
    } else {
        scrollIndicator.style.display = 'none';
        scrollIndicator.classList.remove('pulsing');
    }
}

/**
 * Função de scroll suave para baixo
 */
function scrollToNext() {
    if (!container) return;
    const scrollAmount = container.clientHeight * 0.8;
    container.scrollTo({
        top: container.scrollTop + scrollAmount,
        behavior: 'smooth'
    });
}

/**
 * Atualiza a variável CSS --sec-h e o indicador de scroll
 */
export function atualizarAlturaDoContainer() {
    if (!container) return;
    const h = container.clientHeight;
    container.style.setProperty('--sec-h', h + 'px');
    requestAnimationFrame(atualizarIndicadorScroll);
}

/**
 * Throttled scroll check para performance
 */
let scrollTimeout;
export function throttledScrollCheck() {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
        atualizarIndicadorScroll();
        scrollTimeout = null;
    }, 16); // ~60fps
}

// --- SETUP ÚNICO DOS EVENT LISTENERS ---
if (container) {
    container.addEventListener('scroll', throttledScrollCheck);
}

// Observadores globais
window.addEventListener('resize', atualizarAlturaDoContainer);
if (document.readyState !== 'loading') atualizarAlturaDoContainer();
else document.addEventListener('DOMContentLoaded', atualizarAlturaDoContainer);

if (window.ResizeObserver && container) {
    const roSEC = new ResizeObserver(() => atualizarAlturaDoContainer());
    roSEC.observe(container);
}

// --- UTILITÁRIOS GERAIS ---

/**
 * Formata segundos para mm:ss
 * @param {number} sec - Segundos
 * @returns {string} Tempo formatado
 */
export function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
}

/**
 * Cria cleanup automático usando MutationObserver
 * @param {HTMLElement} element - Elemento a observar
 * @param {Function} cleanupFn - Função de limpeza
 */
export function setupCleanup(element, cleanupFn) {
    const mo = new MutationObserver(() => {
        if (!document.body.contains(element)) {
            cleanupFn();
            mo.disconnect();
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return mo;
}

// --- DEBUG UTILITIES ---
window.debugScrollIndicator = function() {
    console.log('=== SCROLL INDICATOR DEBUG ===');
    console.log('Container:', container);
    console.log('ScrollIndicator:', scrollIndicator);
    console.log('ScrollIndicator connected:', scrollIndicator?.isConnected);
    console.log('Container children:', container?.children.length);
    console.log('Has scrollable content:', container?.scrollHeight > container?.clientHeight);
    
    if (scrollIndicator) {
        console.log('Botão position:', {
            left: scrollIndicator.style.left,
            top: scrollIndicator.style.top,
            bottom: scrollIndicator.style.bottom,
            right: scrollIndicator.style.right,
            position: scrollIndicator.style.position
        });
        console.log('Botão classes:', scrollIndicator.className);
    }
    
    atualizarIndicadorScroll();
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DEBUG: DOM loaded, container:', container);
    setTimeout(() => {
        console.log('⏰ DEBUG: Delayed check...');
        window.debugScrollIndicator();
    }, 2000);
});