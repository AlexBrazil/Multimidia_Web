/**
 * video-element.js
 * Sistema avanÃ§ado de reproduÃ§Ã£o de vÃ­deo com suporte a:
 * - YouTube (via IFrame API com controles customizados)
 * - MÃ­dia direta (MP4, WebM, OGV via HTML5)
 * - Fallback para links externos
 */

import { atualizarAlturaDoContainer, formatTime, setupCleanup } from './base.js';
import { resolveImageAsset, resolveVideoAsset } from '../utils/asset-path.js';

/**
 * UtilitÃ¡rios para YouTube
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
        console.error("URL de ví­deo inválida:", url, error);
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
 * Carrega a YouTube IFrame API uma Ãºnica vez
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
 * @param {string} videoID - ID do vÃ­deo YouTube
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
      <button type="button" class="yt-btn yt-mute" aria-label="Ativar/Desativar som"></button>
      <input class="yt-progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="Progresso do ví­deo" />
      <span class="yt-time" aria-live="off">00:00 / 00:00</span>
      <button type="button" class="yt-btn yt-full" aria-label="Tela cheia">⛶</button>
    `;
    return controls;
}

/**
 * Cria player HTML5 para mÃ­dia direta
 * @param {Object} config - ConfiguraÃ§Ã£o do player
 * @param {string} config.src - URL do vÃ­deo
 * @param {string} config.poster - Imagem de preview
 * @param {string} config.title - TÃ­tulo do vÃ­deo
 * @param {number} config.start - segundo inicial (padrÃ£o 0)
 * @param {number|null} config.end - segundo final (null = atÃ© o fim)
 * @returns {HTMLDivElement} Container do player
 */
function criarVideoHTML5Direto({ src, poster, title, start = 0, end = null }) {
    // Container externo com altura natural
    const shell = document.createElement('div');
    shell.className = 'video-shell';

    // Caixa de proporÃ§Ã£o 16:9
    const inner = document.createElement('div');
    inner.className = 'video-inner';
    shell.appendChild(inner);

    const video = document.createElement('video');
    video.setAttribute('controls', 'controls');
    video.setAttribute('preload', 'metadata');
    if (poster) {
        const posterUrl = resolveImageAsset(poster);
        if (posterUrl) video.setAttribute('poster', posterUrl);
    }
    if (title) video.setAttribute('title', title);

    // Define tipo de mÃ­dia baseado na extensÃ£o
    const source = document.createElement('source');
    source.src = src;
    if (/\.mp4$/i.test(src)) source.type = 'video/mp4';
    else if (/\.webm$/i.test(src)) source.type = 'video/webm';
    else if (/\.ogv$|\.ogg$/i.test(src)) source.type = 'video/ogg';

    video.appendChild(source);
    inner.appendChild(video);

    // Posiciona no tempo inicial apÃ³s carregar metadados
    if (start > 0) {
        video.addEventListener(
            'loadedmetadata',
            () => {
                try {
                    video.currentTime = start;
                } catch {
                    /* ignore seek errors */
                }
            },
            { once: true }
        );
    }
    // Pausa no tempo final se especificado
    if (end !== null && !isNaN(end)) {
        const onTimeUpdate = () => {
            if (video.currentTime >= end) {
                video.pause();
                video.removeEventListener('timeupdate', onTimeUpdate);
            }
        };
        video.addEventListener('timeupdate', onTimeUpdate);
    }

    // [MOD] Garante que cada reproduÃ§Ã£o respeite start/end
    video.addEventListener('play', () => {
        // Se o tempo atual estiver fora do intervalo desejado, reposiciona
        if ((start > 0 && video.currentTime < start - 0.5) ||
            (end !== null && !isNaN(end) && video.currentTime >= end - 0.5)) {
            video.currentTime = start;
        }
    });
    // [MOD] Se o vÃ­deo encerrar (chegou ao fim do arquivo), reposiciona para o prÃ³ximo play
    video.addEventListener('ended', () => {
        if (start > 0) {
            video.currentTime = start;
        }
    });

    // Atualiza altura apÃ³s inserir o player
    requestAnimationFrame(() => atualizarAlturaDoContainer());

    return shell;
}

/**
 * Cria player YouTube com controles customizados
 * @param {string} videoID - ID do vÃ­deo YouTube
 * @param {HTMLElement} containerVideo - Container a ser substituÃ­do
 * @param {Object} element - Dados do elemento
 * @param {Object} opts - opÃ§Ãµes com tempo inicial e final
 * @param {number} opts.start - segundo inicial (padrÃ£o 0)
 * @param {number|null} opts.end - segundo final (null = atÃ© o fim)
 */
async function criarYouTubePlayer(videoID, containerVideo, element, { start = 0, end = null } = {}) {
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

    // Controles prÃ³prios (fora da caixa 16:9)
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
                if (start > 0) {
                    // procura ir para o tempo inicial
                    player.seekTo(start, true);
                }
                timeEl.textContent = `${formatTime(0)} / ${formatTime(duration)}`;

                // Timer para atualizar progresso (~10x/seg)
                progressTimer = setInterval(() => {
                    const ct = player.getCurrentTime();
                    if (!isFinite(ct)) return;
                    timeEl.textContent = `${formatTime(ct)} / ${formatTime(duration)}`;
                    if (duration > 0) {
                        progress.value = (ct / duration) * 100;
                    }
                    // Se end Ã© definido e ultrapassado, pausa o player
                    if (end !== null && !isNaN(end) && ct >= end) {
                        player.pauseVideo();
                        clearInterval(progressTimer);
                    }
                }, 100);

                // Recalcula apÃ³s o player estar pronto
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
        const ct    = player.getCurrentTime();

        if (state === YT.PlayerState.PLAYING) {
            player.pauseVideo();
            return;
        }

        // [MOD] Se o vÃ­deo terminou ou estÃ¡ fora do intervalo, reposiciona no inÃ­cio definido
        const outOfRange =
            (start > 0 && ct < start - 0.5) ||
            (end !== null && !isNaN(end) && ct >= end - 0.5) ||
            state === YT.PlayerState.ENDED;
        if (outOfRange) {
            player.seekTo(start, true);
        }

        player.playVideo();
    });

    // Define Ã­cone inicial de acordo com o estado do player (mutado por padrÃ£o)
    muteBtn.textContent = '🔇';

    muteBtn.addEventListener('click', () => {
        if (player.isMuted()) {
            player.unMute();
            muteBtn.textContent = '🔊'; // som ligado
        } else {
            player.mute();
            muteBtn.textContent = '🔇'; // som desligado
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

    // Cleanup automÃ¡tico do timer
    setupCleanup(shell, () => {
        if (progressTimer) clearInterval(progressTimer);
    });
}

/**
 * FunÃ§Ã£o principal para criar elemento de vÃ­deo
 * @param {Object} element - Objeto VideoElement do data.json
 * @param {string} element.video - URL do vÃ­deo (YouTube ou direto)
 * @param {string} element.previewImage - Imagem de preview
 * @param {string} element.title - TÃ­tulo do vÃ­deo
 * @param {number|string} element.start_time - novo campo opcional (segundos)
 * @param {number|string} element.start_end - novo campo opcional (segundos)
 * @returns {HTMLDivElement} Container do vÃ­deo
 */
export function criarVideo(element) {
    const url = element.video || '';
    const mediaUrl = resolveVideoAsset(url);
    const isYT = isYouTubeUrl(url);
    const videoID = isYT ? extrairVideoIDdoYouTube(url) : null;

    // LÃª tempos inicial e final do objeto, se existirem
    const start = element.start_time != null && !isNaN(parseFloat(element.start_time))
        ? parseFloat(element.start_time)
        : 0;
    const end = element.start_end != null && !isNaN(parseFloat(element.start_end))
        ? parseFloat(element.start_end)
        : null;

    // Container inicial com preview + botÃ£o play
    const containerVideo = document.createElement('div');
    containerVideo.className = 'video-container-lazy';

    // Adiciona imagem de preview se disponÃ­vel
    if (element.previewImage) {
        const previewImg = document.createElement('img');
        const previewUrl = resolveImageAsset(element.previewImage);
        previewImg.src = previewUrl || element.previewImage;
        previewImg.alt = element.title || 'PrÃ©-visualizaÃ§Ã£o do vÃ­deo';

        // Atualiza altura quando preview carregar
        previewImg.addEventListener('load', atualizarAlturaDoContainer, { once: true });
        containerVideo.appendChild(previewImg);
    }

    // BotÃ£o de play overlay
    const playButton = document.createElement('div');
    playButton.className = 'play-button-overlay';
    containerVideo.appendChild(playButton);

    // Evento de clique - decide estratÃ©gia de reproduÃ§Ã£o
    containerVideo.addEventListener(
        'click',
        async () => {
            // EstratÃ©gia 1: MÃ­dia direta â†’ HTML5 nativo
            if (isDirectMediaUrl(mediaUrl)) {
                if (!mediaUrl) {
                    console.warn('URL de video vazia para playback direto.');
                    return;
                }
                const player = criarVideoHTML5Direto({
                    src: mediaUrl,
                    poster: element.previewImage || null,
                    title: element.title || '',
                    start,
                    end
                });
                containerVideo.replaceWith(player);
                return;
            }

            // EstratÃ©gia 2: YouTube â†’ API com controles customizados
            if (isYT && videoID) {
                await criarYouTubePlayer(videoID, containerVideo, element, { start, end });
                return;
            }

            // EstratÃ©gia 3: Fallback â†’ nova aba
            try {
                const fallbackUrl = mediaUrl || url;
                if (fallbackUrl) {
                    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
                }
            } catch (e) {
                console.warn('Falha ao abrir o link de vÃ­deo:', e);
            }
        },
        { once: true }
    );

    return containerVideo;
}






