/**
 * video-element.js
 * Sistema avançado de reprodução de vídeo com suporte a:
 * - YouTube (via IFrame API com controles customizados)
 * - Mídia direta (MP4, WebM, OGV via HTML5)
 * - Fallback para links externos
 */

import { atualizarAlturaDoContainer, formatTime, setupCleanup } from './base.js';

/**
 * Utilitários para YouTube
 */
function extrairVideoIDdoYouTube(url) {
    if (!url) return null;
    let videoID = '';
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoID = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            videoID = urlObj.searchParams.get('v');
            // Suporte a /embed/VIDEO_ID
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

/**
 * Carrega a YouTube IFrame API uma única vez
 * @returns {Promise} Resolve quando API estiver pronta
 */
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

/**
 * Cria URL de embed otimizada para uso com API
 * @param {string} videoID - ID do vídeo YouTube
 * @returns {string} URL de embed
 */
function buildYouTubeEmbedUrlForAPI(videoID) {
    const params = new URLSearchParams({
        autoplay: '1',
        mute: '1',
        controls: '0',
        rel: '0',
        modestbranding: '1',
        iv_load_policy: '3',
        playsinline: '1',
        enablejsapi: '1',
        origin: location.origin
    });
    return `https://www.youtube.com/embed/${videoID}?${params.toString()}`;
}

/**
 * Cria controles customizados para YouTube player
 * @returns {HTMLDivElement} Elemento com controles
 */
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

/**
 * Cria player HTML5 para mídia direta
 * @param {Object} config - Configuração do player
 * @param {string} config.src - URL do vídeo
 * @param {string} config.poster - Imagem de preview
 * @param {string} config.title - Título do vídeo
 * @returns {HTMLDivElement} Container do player
 */
function criarVideoHTML5Direto({ src, poster, title }) {
    // Container externo com altura natural
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
    if (title) video.setAttribute('title', title);

    // Define tipo de mídia baseado na extensão
    const source = document.createElement('source');
    source.src = src;
    if (/\.mp4$/i.test(src)) source.type = 'video/mp4';
    else if (/\.webm$/i.test(src)) source.type = 'video/webm';
    else if (/\.ogv$|\.ogg$/i.test(src)) source.type = 'video/ogg';

    video.appendChild(source);
    inner.appendChild(video);

    // Atualiza altura após inserir o player
    requestAnimationFrame(() => atualizarAlturaDoContainer());

    return shell;
}

/**
 * Cria player YouTube com controles customizados
 * @param {string} videoID - ID do vídeo YouTube
 * @param {HTMLElement} containerVideo - Container a ser substituído
 * @param {Object} element - Dados do elemento
 */
async function criarYouTubePlayer(videoID, containerVideo, element) {
    await ensureYouTubeAPI();

    // Container externo (altura natural)
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

    // Substitui o placeholder
    containerVideo.replaceWith(shell);
    requestAnimationFrame(() => atualizarAlturaDoContainer());

    let duration = 0;
    let progressTimer = null;

    // Elementos dos controles
    const playBtn = controls.querySelector('.yt-play');
    const muteBtn = controls.querySelector('.yt-mute');
    const fullBtn = controls.querySelector('.yt-full');
    const progress = controls.querySelector('.yt-progress');
    const timeEl = controls.querySelector('.yt-time');

    // Cria o player YouTube
    const player = new YT.Player(hostId, {
        videoId: videoID,
        playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            playsinline: 1,
            origin: location.origin
        },
        events: {
            onReady: () => {
                duration = player.getDuration() || 0;
                timeEl.textContent = `${formatTime(0)} / ${formatTime(duration)}`;
                
                // Timer para atualizar progresso (~10x/seg)
                progressTimer = setInterval(() => {
                    const ct = player.getCurrentTime();
                    if (!isFinite(ct)) return;
                    timeEl.textContent = `${formatTime(ct)} / ${formatTime(duration)}`;
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

    // Event listeners dos controles
    playBtn.addEventListener('click', () => {
        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) player.pauseVideo();
        else player.playVideo();
    });

    muteBtn.addEventListener('click', () => {
        if (player.isMuted()) { 
            player.unMute(); 
            muteBtn.textContent = '🔊'; 
        } else { 
            player.mute(); 
            muteBtn.textContent = '🔇'; 
        }
    });

    progress.addEventListener('input', () => {
        if (duration > 0) {
            const t = (parseFloat(progress.value) / 100) * duration;
            player.seekTo(t, true);
        }
    });

    // Fullscreen no container completo
    fullBtn.addEventListener('click', () => {
        const el = shell;
        if (!document.fullscreenElement) el.requestFullscreen?.();
        else document.exitFullscreen?.();
    });

    // Cleanup automático do timer
    setupCleanup(shell, () => {
        if (progressTimer) clearInterval(progressTimer);
    });
}

/**
 * Função principal para criar elemento de vídeo
 * @param {Object} element - Objeto VideoElement do data.json
 * @param {string} element.video - URL do vídeo (YouTube ou direto)
 * @param {string} element.previewImage - Imagem de preview
 * @param {string} element.title - Título do vídeo
 * @returns {HTMLDivElement} Container do vídeo
 */
export function criarVideo(element) {
    const url = element.video || '';
    const isYT = isYouTubeUrl(url);
    const videoID = isYT ? extrairVideoIDdoYouTube(url) : null;

    // Container inicial com preview + botão play
    const containerVideo = document.createElement('div');
    containerVideo.className = 'video-container-lazy';

    // Adiciona imagem de preview se disponível
    if (element.previewImage) {
        const previewImg = document.createElement('img');
        previewImg.src = `assets/images/${element.previewImage}`;
        previewImg.alt = element.title || 'Pré-visualização do vídeo';
        
        // Atualiza altura quando preview carregar
        previewImg.addEventListener('load', atualizarAlturaDoContainer, { once: true });
        containerVideo.appendChild(previewImg);
    }

    // Botão de play overlay
    const playButton = document.createElement('div');
    playButton.className = 'play-button-overlay';
    containerVideo.appendChild(playButton);

    // Evento de clique - decide estratégia de reprodução
    containerVideo.addEventListener('click', async () => {
        // Estratégia 1: Mídia direta → HTML5 nativo
        if (isDirectMediaUrl(url)) {
            const player = criarVideoHTML5Direto({
                src: url,
                poster: element.previewImage || null,
                title: element.title || ''
            });
            containerVideo.replaceWith(player);
            return;
        }

        // Estratégia 2: YouTube → API com controles customizados
        if (isYT && videoID) {
            await criarYouTubePlayer(videoID, containerVideo, element);
            return;
        }

        // Estratégia 3: Fallback → nova aba
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (e) {
            console.warn('Falha ao abrir o link de vídeo:', e);
        }
    }, { once: true });

    return containerVideo;
}