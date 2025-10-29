// Imports de todos os elementos especializados
import { criarScrollIndicator, atualizarAlturaDoContainer } from './elements/base.js';
import { criarTexto } from './elements/text-element.js';
import { criarLista } from './elements/list-element.js';
import { criarImagem } from './elements/image-element.js';
import { criarVideo } from './elements/video-element.js';
import { criarGrid } from './elements/grid-element.js';
import { criarGrupo } from './elements/group-element.js';
import { criarGatilhoInfoBox } from './elements/infobox-element.js';
import { criarEspacador } from './elements/spacer-element.js';
import { criarAppLauncher } from './elements/app-launcher.js';
import { criarCardImage } from './elements/card-image-element.js';
import { resolveAudioAsset } from './utils/asset-path.js';

// Import da funÃ§Ã£o de modal do main.js
import { abrirModal } from './main.js';

// --- ELEMENTOS DA DOM ---
const container = document.getElementById('slide-elements-container');
const titleEl = document.getElementById('slide-title');
const subtitleEl = document.getElementById('slide-subtitle');
const audioPlayer = document.getElementById('audio-player');

// ReferÃªncia ao scroll indicator
let scrollIndicator = null;

/**
 * FunÃ§Ã£o principal que renderiza um slide completo
 * @param {Object} slideObject - Objeto do slide vindo do JSON
 */
export function renderSlide(slideObject) {
  console.log(`Renderizando slide: ID ${slideObject.id} - "${slideObject.title}"`);

  // 1. Limpa o conteÃºdo anterior
  container.innerHTML = '';

  // 2. Cria/recria o botÃ£o scroll (ele se anexa ao #conteudo-principal no base.js)
  scrollIndicator = criarScrollIndicator();

  // 3. Atualiza cabeÃ§alho do slide
  titleEl.textContent = slideObject.title || '';
  subtitleEl.textContent = slideObject.subtitle || '';

  // 4. Configura player de Ã¡udio
  if (slideObject.audio) {
    const audioUrl = resolveAudioAsset(slideObject.audio);
    if (audioUrl) {
      audioPlayer.src = audioUrl;
      audioPlayer.style.display = 'block';
    } else {
      audioPlayer.style.display = 'none';
      audioPlayer.removeAttribute('src');
    }
  } else {
    audioPlayer.style.display = 'none';
    audioPlayer.removeAttribute('src');
  }

  // 5. Renderiza todos os elementos do slide
  if (slideObject.elements && slideObject.elements.length > 0) {
    slideObject.elements.forEach((element) => {
      const htmlElement = criarElemento(element);
      if (htmlElement) {
        container.appendChild(htmlElement);
      }
    });
  }

  // 6. Atualiza altura apÃ³s renderizaÃ§Ã£o completa
  requestAnimationFrame(() => atualizarAlturaDoContainer());
}

/**
 * Factory Pattern - decide qual funÃ§Ã£o de renderizaÃ§Ã£o chamar
 * @param {Object} elementObject - Objeto do elemento do data.json
 * @returns {HTMLElement|null} Elemento HTML renderizado
 */
export function criarElemento(elementObject) {
  // ValidaÃ§Ã£o de entrada
  if (!elementObject || !elementObject.type) {
    console.warn('Tentativa de renderizar um objeto de elemento invÃ¡lido:', elementObject);
    return null;
  }

  // Factory Pattern - delega para mÃ³dulo especializado
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
      // GroupElement precisa da funÃ§Ã£o factory para recursÃ£o
      return criarGrupo(elementObject, criarElemento);

    case 'InfoBoxElement':
      // InfoBox precisa da funÃ§Ã£o do modal
      return criarGatilhoInfoBox(elementObject, abrirModal);

    case 'SpacerElement':
      return criarEspacador(elementObject);

    case 'AppLauncherElement':
      return criarAppLauncher(elementObject);

    case 'CardImageElement': 
      return criarCardImage(elementObject, abrirModal);

    default:
      console.warn(`Tipo de elemento nÃ£o suportado: ${elementObject.type}`);
      return null;
  }
}





