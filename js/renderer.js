/**
 * renderer.js
 * Módulo responsável por renderizar o conteúdo de um slide na DOM.
 * Ele transforma os objetos do data.json em elementos HTML.
 */

// Importa a função para abrir o modal, que está no main.js
import { abrirModal } from './main.js';

// Elementos da DOM onde o conteúdo será renderizado
const container = document.getElementById('slide-elements-container');
const titleEl = document.getElementById('slide-title');
const subtitleEl = document.getElementById('slide-subtitle');
const audioPlayer = document.getElementById('audio-player');
// Modo de ancoragem do InfoBox: 'auto-prev' (recomendado) 
// ou 'container' (usa os valores X e Y do data.json)
const INFOBOX_ANCHOR_MODE = 'auto-prev';

/**
 * Atualiza a variável CSS --sec-h com a altura útil do #slide-elements-container.
 * Isso permite ao CSS limitar a largura de players de vídeo em função da altura disponível
 * mantendo a proporção 16:9 (ver regras com aspect-ratio no style.css).
 */
export function atualizarAlturaDoContainer() {
    if (!container) return;
    // clientHeight = altura interna visível (desconsidera barra de rolagem)
    const h = container.clientHeight;
    container.style.setProperty('--sec-h', h + 'px');
}

// Observa redimensionamentos de janela e do próprio container
window.addEventListener('resize', atualizarAlturaDoContainer);
if (document.readyState !== 'loading') atualizarAlturaDoContainer();
else document.addEventListener('DOMContentLoaded', atualizarAlturaDoContainer);

if (window.ResizeObserver && container) {
    const roSEC = new ResizeObserver(() => atualizarAlturaDoContainer());
    roSEC.observe(container);
}

/**
 * Função principal que renderiza um slide completo.
 * @param {Object} slideObject - O objeto do slide vindo do JSON.
 */
export function renderSlide(slideObject) {
    console.log(`Renderizando slide: ID ${slideObject.id} - "${slideObject.title}"`);

    // 1. Limpa o conteúdo anterior
    container.innerHTML = '';
    
    // 2. Atualiza título e subtítulo
    titleEl.textContent = slideObject.title || '';
    subtitleEl.textContent = slideObject.subtitle || '';

    // 3. Atualiza o player de áudio
    if (slideObject.audio) {
        audioPlayer.src = `assets/audio/${slideObject.audio}`;
        audioPlayer.style.display = 'block';
    } else {
        audioPlayer.style.display = 'none';
        audioPlayer.src = '';
    }
    
    // 4. Percorre e renderiza cada elemento do slide
    if (slideObject.elements && slideObject.elements.length > 0) {
        slideObject.elements.forEach(element => {
            const htmlElement = criarElemento(element);
            if (htmlElement) {
                container.appendChild(htmlElement);
            }
        });
    }

    // 5. Após renderização, atualiza altura (próximo frame para layout estabilizar)
    requestAnimationFrame(() => atualizarAlturaDoContainer());
}

/**
 * Função "roteadora" que decide qual função de renderização chamar
 * com base no tipo do elemento. Exportada para ser usada no modal.
 * @param {Object} elementObject - O objeto do elemento.
 * @returns {HTMLElement|null}
 */
export function criarElemento(elementObject) {
    // Adiciona uma verificação para garantir que o objeto existe
    if (!elementObject || !elementObject.type) {
        console.warn('Tentativa de renderizar um objeto de elemento inválido:', elementObject);
        return null;
    }

    switch (elementObject.type) {
        case 'TextElement':
            return criarTexto(elementObject);
        case 'ListElement':
            return criarLista(elementObject);
        case 'ImageElement':
            return criarImagem(elementObject);
        case 'VideoElement':
            return criarVideo(elementObject);
        case 'GridElement':
            return criarGrid(elementObject);
        case 'GroupElement':
            return criarGrupo(elementObject);
        case 'InfoBoxElement':
            return criarGatilhoInfoBox(elementObject);
        case 'SpacerElement':
            return criarEspacador(elementObject);
        case 'AppLauncherElement':
            return criarAppLauncher(elementObject);
        default:
            console.warn(`Tipo de elemento não suportado: ${elementObject.type}`);
            return null;
    }
}

// --- Funções Específicas de Renderização ---

function criarTexto(element) {
    const p = document.createElement('p');
    p.className = `text-element ${element.styleName || 'paragraph'}`;
    p.innerHTML = (element.text || '').replace(/\n/g, '<br>');
    return p;
}

function criarLista(element) {
    const isOrdered = element.styleName === 'numberList';
    const listElement = document.createElement(isOrdered ? 'ol' : 'ul');
    listElement.className = `list-element ${element.styleName}`;

    if (isOrdered && element.startIndex > 1) {
        listElement.start = element.startIndex;
    }

    const items = (element.text || '').split('\n').filter(item => item.trim() !== '');
    items.forEach(itemText => {
        const li = document.createElement('li');
        li.textContent = itemText;
        listElement.appendChild(li);
    });
    return listElement;
}

function criarImagem(element) {
    if (element.source && element.source.toLowerCase().endsWith('.swf')) {
        const warning = document.createElement('div');
        warning.className = 'flash-warning';
        warning.textContent = `Conteúdo interativo obsoleto (Flash: ${element.source}).`;
        return warning;
    }

    const figure = document.createElement('figure');
    figure.className = 'image-element';

    const img = document.createElement('img');
    img.src = `assets/images/${element.source}`;
    img.alt = element.searchText || element.title || 'Imagem do curso';
    img.title = element.title || '';

    if (element.width > 0) img.style.width = `${element.width}px`;
    if (element.height > 0) img.style.height = `${element.height}px`;

    // Quando a imagem terminar de carregar, atualize a altura disponível
    img.addEventListener('load', atualizarAlturaDoContainer, { once: true });

    figure.appendChild(img);

    if (element.legend) {
        const figcaption = document.createElement('figcaption');
        figcaption.textContent = element.legend;
        figure.appendChild(figcaption);
    }
    return figure;
}

// --------------------
// --- V Í D E O S  ---
// --------------------

function extrairVideoIDdoYouTube(url) {
    if (!url) return null;
    let videoID = '';
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoID = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            videoID = urlObj.searchParams.get('v');
            // suporta /embed/VIDEO_ID
            if (!videoID && urlObj.pathname.includes('/embed/')) {
                videoID = urlObj.pathname.split('/embed/')[1]?.split(/[/?#]/)[0] || '';
            }
        }
    } catch (error) {
        console.error("URL de vídeo inválida:", url, error);
        return null;
    }
    return videoID || null;
}

function isYouTubeUrl(url) {
    try {
        const u = new URL(url);
        return u.hostname.includes('youtube.com') || u.hostname === 'youtu.be';
    } catch {
        return false;
    }
}

function isDirectMediaUrl(url) {
    return /\.(mp4|webm|ogv|ogg)$/i.test(url || '');
}

// Carrega a YouTube IFrame API uma única vez e resolve quando pronta
function ensureYouTubeAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (window._ytApiReadyPromise) return window._ytApiReadyPromise;

    window._ytApiReadyPromise = new Promise((resolve) => {
        window.onYouTubeIframeAPIReady = () => resolve();
    });

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    return window._ytApiReadyPromise;
}

// URL de embed específica para uso com API (controls=0 para UI própria)
function buildYouTubeEmbedUrlForAPI(videoID) {
    const params = new URLSearchParams({
        autoplay: '1',
        mute: '1',            // autoplay confiável
        controls: '0',        // sem UI nativa
        rel: '0',
        modestbranding: '1',
        iv_load_policy: '3',
        playsinline: '1',
        enablejsapi: '1',
        origin: location.origin
    });
    return `https://www.youtube.com/embed/${videoID}?${params.toString()}`;
}

// Cria o bloco de controles próprios (HTML)
function criarControlesUI() {
    const controls = document.createElement('div');
    controls.className = 'yt-controls';
    controls.innerHTML = `
      <button type="button" class="yt-btn yt-play" aria-label="Reproduzir/Pausar">▶</button>
      <button type="button" class="yt-btn yt-mute" aria-label="Ativar/Desativar som">🔇</button>
      <input class="yt-progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="Progresso do vídeo" />
      <span class="yt-time" aria-live="off">00:00 / 00:00</span>
      <button type="button" class="yt-btn yt-full" aria-label="Tela cheia">⛶</button>
    `;
    return controls;
}

// Formata mm:ss
function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
}

// Player HTML5 para mídia direta (fallback simples com controles nativos)
function criarVideoHTML5Direto({ src, poster, title }) {
  // Contêiner externo com altura natural
  const shell = document.createElement('div');
  shell.className = 'video-shell';

  // Caixa de proporção 16:9
  const inner = document.createElement('div');
  inner.className = 'video-inner';
  shell.appendChild(inner);

  const video = document.createElement('video');
  video.setAttribute('controls', 'controls');
  video.setAttribute('preload', 'metadata');
  if (poster) video.setAttribute('poster', `assets/images/${poster}`);
  if (title)  video.setAttribute('title', title);

  const source = document.createElement('source');
  source.src = src;
  if (/\.mp4$/i.test(src)) source.type = 'video/mp4';
  else if (/\.webm$/i.test(src)) source.type = 'video/webm';
  else if (/\.ogv$|\.ogg$/i.test(src)) source.type = 'video/ogg';

  video.appendChild(source);
  inner.appendChild(video);

  // Atualiza a altura do container após inserir o player
  requestAnimationFrame(() => atualizarAlturaDoContainer());

  return shell;
}

function criarVideo(element) {
    const url = element.video || '';
    const isYT = isYouTubeUrl(url);
    const videoID = isYT ? extrairVideoIDdoYouTube(url) : null;

    // Container/placeholder inicial com preview + botão play
    const containerVideo = document.createElement('div');
    containerVideo.className = 'video-container-lazy';

    if (element.previewImage) {
        const previewImg = document.createElement('img');
        previewImg.src = `assets/images/${element.previewImage}`;
        previewImg.alt = element.title || 'Pré-visualização do vídeo';
        // Quando a prévia carregar, atualize a altura (afeta layout)
        previewImg.addEventListener('load', atualizarAlturaDoContainer, { once: true });
        containerVideo.appendChild(previewImg);
    }

    const playButton = document.createElement('div');
    playButton.className = 'play-button-overlay';
    containerVideo.appendChild(playButton);

    // Clique: decide estratégia
    containerVideo.addEventListener('click', async () => {
        // 1) Mídia direta → <video> nativo
        if (isDirectMediaUrl(url)) {
            const player = criarVideoHTML5Direto({
                src: url,
                poster: element.previewImage || null,
                title: element.title || ''
            });
            containerVideo.replaceWith(player);
            requestAnimationFrame(() => atualizarAlturaDoContainer());
            return;
        }

        // 2) YouTube com controles próprios via IFrame API
        if (isYT && videoID) {
            await ensureYouTubeAPI();

            // Contêiner externo (altura natural)
            const shell = document.createElement('div');
            shell.className = 'video-shell';

            // Caixa 16:9 apenas para o iframe
            const inner = document.createElement('div');
            inner.className = 'video-inner';
            shell.appendChild(inner);

            // Host do iframe (a API injeta aqui)
            const playerHost = document.createElement('div');
            const hostId = `yt-player-${videoID}-${Math.random().toString(36).slice(2)}`;
            playerHost.id = hostId;
            inner.appendChild(playerHost);

            // Controles próprios (fora da caixa 16:9)
            const controls = criarControlesUI();
            shell.appendChild(controls);

            // Troca o placeholder
            containerVideo.replaceWith(shell);
            requestAnimationFrame(() => atualizarAlturaDoContainer());

            let duration = 0;
            let progressTimer = null;

            const playBtn  = controls.querySelector('.yt-play');
            const muteBtn  = controls.querySelector('.yt-mute');
            const fullBtn  = controls.querySelector('.yt-full');
            const progress = controls.querySelector('.yt-progress');
            const timeEl   = controls.querySelector('.yt-time');

            const player = new YT.Player(hostId, {
                videoId: videoID,
                playerVars: {
                    autoplay: 1,
                    mute: 1,
                    controls: 0,        // escondemos a UI nativa
                    rel: 0,
                    modestbranding: 1,
                    iv_load_policy: 3,
                    playsinline: 1,
                    origin: location.origin
                },
                events: {
                    onReady: () => {
                        duration = player.getDuration() || 0;
                        timeEl.textContent = `${fmtTime(0)} / ${fmtTime(duration)}`;
                        // Atualiza ~10x/seg
                        progressTimer = setInterval(() => {
                            const ct = player.getCurrentTime();
                            if (!isFinite(ct)) return;
                            timeEl.textContent = `${fmtTime(ct)} / ${fmtTime(duration)}`;
                            if (duration > 0) {
                                progress.value = (ct / duration) * 100;
                            }
                        }, 100);

                        // Recalcula após o player estar pronto
                        requestAnimationFrame(() => atualizarAlturaDoContainer());
                    },
                    onStateChange: (e) => {
                        if (e.data === YT.PlayerState.PLAYING) {
                            playBtn.textContent = '⏸';
                        } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
                            playBtn.textContent = '▶';
                        }
                    }
                }
            });

            // Controles
            playBtn.addEventListener('click', () => {
                const state = player.getPlayerState();
                if (state === YT.PlayerState.PLAYING) player.pauseVideo();
                else player.playVideo();
            });

            muteBtn.addEventListener('click', () => {
                if (player.isMuted()) { player.unMute(); muteBtn.textContent = '🔊'; }
                else { player.mute(); muteBtn.textContent = '🔇'; }
            });

            progress.addEventListener('input', () => {
                if (duration > 0) {
                    const t = (parseFloat(progress.value) / 100) * duration;
                    player.seekTo(t, true);
                }
            });

            // Fullscreen no shell (wrapper externo)
            fullBtn.addEventListener('click', () => {
                const el = shell;
                if (!document.fullscreenElement) el.requestFullscreen?.();
                else document.exitFullscreen?.();
            });

            // Limpeza do timer quando remover do DOM (ex.: troca de slide)
            const mo = new MutationObserver(() => {
                if (!document.body.contains(shell)) {
                    if (progressTimer) clearInterval(progressTimer);
                    mo.disconnect();
                }
            });
            mo.observe(document.body, { childList: true, subtree: true });

            return;
        }

        // 3) Fallback: abre o link em nova aba (p. ex. hospedador externo)
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (e) {
            console.warn('Falha ao abrir o link de vídeo:', e);
        }
    }, { once: true });

    return containerVideo;
}

// --------------------
// ---   TABELA     ---
// --------------------
function criarGrid(element) {
    const table = document.createElement('table');
    table.className = 'grid-element';
    
    const content = element.content || [];
    const isFirstRowHeader = element.isFirstRowHeader || false;

    if (isFirstRowHeader && content.length > 0) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        content[0].forEach((cellText, colIndex) => {
            const th = document.createElement('th');
            th.textContent = (cellText || '').trim();
            if (colIndex === element.featureColumn) {
                th.classList.add('feature-column');
            }
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
    }

    const tbody = document.createElement('tbody');
    const startIndex = isFirstRowHeader ? 1 : 0;
    for (let i = startIndex; i < content.length; i++) {
        const row = document.createElement('tr');
        if (element.alternateRowColor && (i - startIndex) % 2 !== 0) {
            row.classList.add('alternate-row');
        }
        content[i].forEach((cellText, colIndex) => {
            const td = document.createElement('td');
            td.textContent = (cellText || '').trim();
            if (colIndex === element.featureColumn) {
                td.classList.add('feature-column');
            }
            row.appendChild(td);
        });
        tbody.appendChild(row);
    }
    table.appendChild(tbody);
    
    // Atualiza após montar a tabela (caso altura mude)
    requestAnimationFrame(() => atualizarAlturaDoContainer());

    return table;
}

// --------------------
// ---   GRUPO      ---
// --------------------
function criarGrupo(element) {
    const div = document.createElement('div');
    div.className = 'group-container';
    div.style.display = 'flex';
    div.style.flexDirection = element.mode === 'horizontalGroup' ? 'row' : 'column';
    
    const hAlignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
    const vAlignMap = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
    
    div.style.justifyContent = hAlignMap[element.horizontalAlign] || 'flex-start';
    div.style.alignItems = vAlignMap[element.verticalAlign] || 'flex-start';

    if (element.fillHeight) {
        div.style.flexGrow = '1';
    }
    
    if (element.elements) {
        element.elements.forEach(child => {
            const childEl = criarElemento(child);
            if (childEl) div.appendChild(childEl);
        });
    }

    // Atualiza após montar o grupo (altura pode variar)
    requestAnimationFrame(() => atualizarAlturaDoContainer());

    return div;
}

// --------------------
// ---  INFOBOX     ---
// --------------------
function criarGatilhoInfoBox(element) {
    const button = document.createElement('button');
    button.className = 'infobox-trigger';
    button.innerHTML = 'i';
    button.title = `Info: ${element.title}`;

    // Garante que o botão posiciona relativo ao container
    button.style.position = 'absolute';

    // 1) Escolhe o elemento âncora
    let anchorEl = null;
    if (INFOBOX_ANCHOR_MODE === 'auto-prev') {
        // Pega o último filho "renderizado" antes do infobox
        const children = Array.from(container.children);
        for (let i = children.length - 1; i >= 0; i--) {
            const el = children[i];
            if (!el.classList.contains('infobox-trigger')) { // evita outro infobox
                anchorEl = el;
                break;
            }
        }
    }
    // Se não achou, caímos no modo container
    const useContainerOnly = INFOBOX_ANCHOR_MODE === 'container' || !anchorEl;

    // 2) Função para (re)posicionar
    const applyPosition = () => {
        if (!button.isConnected) return;

        const contRect = container.getBoundingClientRect();
        let left = (element.x || 0);
        let top  = (element.y || 0);

        if (!useContainerOnly && anchorEl && anchorEl.isConnected) {
            const aRect = anchorEl.getBoundingClientRect();
            left = (aRect.left - contRect.left) + (element.x || 0);
            top  = (aRect.top  - contRect.top ) + (element.y || 0);
        }

        // CLAMP: garante que o botão caiba no container
        const maxLeft = container.clientWidth  - button.offsetWidth;
        const maxTop  = container.clientHeight - button.offsetHeight;
        left = Math.max(0, Math.min(left, maxLeft));
        top  = Math.max(0, Math.min(top,  maxTop));

        button.style.left = `${left}px`;
        button.style.top  = `${top}px`;
    };

    // 3) Observadores para acompanhar mudanças de layout
    const ro = new ResizeObserver(() => {
        applyPosition();
        atualizarAlturaDoContainer();
    });
    ro.observe(container);
    if (anchorEl) ro.observe(anchorEl);

    // Reposiciona quando imagens/iframes do anchor terminam de carregar
    if (anchorEl) {
        anchorEl.querySelectorAll('img, video, iframe').forEach(m => {
            const onLoad = () => {
                applyPosition();
                atualizarAlturaDoContainer();
            };
            // imagens
            if ('complete' in m) {
                if (!m.complete) m.addEventListener('load', onLoad, { once: true });
            } else {
                // vídeos/iframes
                m.addEventListener('load', onLoad, { once: true });
            }
            // vídeos em <video> disparam 'loadedmetadata'
            m.addEventListener?.('loadedmetadata', onLoad, { once: true });
        });
    }

    // Também reposiciona no resize da janela
    const onResize = () => {
        if (!button.isConnected) {
            window.removeEventListener('resize', onResize);
            ro.disconnect();
            return;
        }
        applyPosition();
        atualizarAlturaDoContainer();
    };
    window.addEventListener('resize', onResize);

    // Cleanup quando o botão sai do DOM (troca de slide)
    const mo = new MutationObserver(() => {
        if (!document.body.contains(button)) {
            window.removeEventListener('resize', onResize);
            ro.disconnect();
            mo.disconnect();
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // 4) Click → abre modal
    button.addEventListener('click', () => abrirModal(element));

    // 5) Posiciona na próxima frame (layout estável)
    requestAnimationFrame(() => {
        applyPosition();
        atualizarAlturaDoContainer();
    });

    return button;
}


// --------------------
// ---  ESPAÇADOR   ---
// --------------------
function criarEspacador(element) {
    const spacer = document.createElement('span');
    spacer.className = 'spacer';
    spacer.style.width = `${element.width || 0}px`;
    spacer.style.height = `${element.height || 0}px`; // Adicionando suporte à altura

    // Atualiza após inserir espaçador (pode alterar a altura do layout)
    requestAnimationFrame(() => atualizarAlturaDoContainer());

    return spacer;
}

// --------------------
// ---  APP LAUNCH  ---
// --------------------
function criarAppLauncher(element) {
    const link = document.createElement('a');
    link.className = 'app-launcher-button';
    link.href = element.path;
    link.textContent = 'Abrir Atividade Interativa';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    // Mudança de layout mínima; ainda assim atualizamos por consistência
    requestAnimationFrame(() => atualizarAlturaDoContainer());

    return link;
}
