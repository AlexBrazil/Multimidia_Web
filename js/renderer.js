/**
 * renderer.js (REFATORADO)
 * Coordenador principal da renderização - Factory Pattern.
 * Orquestra todos os elementos especializados.
 */

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

// Import da função de modal do main.js
import { abrirModal } from './main.js';

// --- ELEMENTOS DA DOM ---
const container = document.getElementById('slide-elements-container');
const titleEl = document.getElementById('slide-title');
const subtitleEl = document.getElementById('slide-subtitle');
const audioPlayer = document.getElementById('audio-player');

// Referência ao scroll indicator
let scrollIndicator = null;

/**
 * Função principal que renderiza um slide completo
 * @param {Object} slideObject - Objeto do slide vindo do JSON
 */
export function renderSlide(slideObject) {
    console.log(`Renderizando slide: ID ${slideObject.id} - "${slideObject.title}"`);

    // 1. Limpa o conteúdo anterior
    container.innerHTML = '';
    
    // 2. Cria/recria o botão scroll como filho do container
    scrollIndicator = criarScrollIndicator();
    
    // 3. Atualiza cabeçalho do slide
    titleEl.textContent = slideObject.title || '';
    subtitleEl.textContent = slideObject.subtitle || '';

    // 4. Configura player de áudio
    if (slideObject.audio) {
        audioPlayer.src = `assets/audio/${slideObject.audio}`;
        audioPlayer.style.display = 'block';
    } else {
        audioPlayer.style.display = 'none';
        audioPlayer.src = '';
    }
    
    // 5. Renderiza todos os elementos do slide
    if (slideObject.elements && slideObject.elements.length > 0) {
        slideObject.elements.forEach(element => {
            const htmlElement = criarElemento(element);
            if (htmlElement) {
                container.appendChild(htmlElement);
            }
        });
    }

    // 6. Atualiza altura após renderização completa
    requestAnimationFrame(() => atualizarAlturaDoContainer());
}

/**
 * Factory Pattern - decide qual função de renderização chamar
 * @param {Object} elementObject - Objeto do elemento do data.json
 * @returns {HTMLElement|null} Elemento HTML renderizado
 */
export function criarElemento(elementObject) {
    // Validação de entrada
    if (!elementObject || !elementObject.type) {
        console.warn('Tentativa de renderizar um objeto de elemento inválido:', elementObject);
        return null;
    }

    // Factory Pattern - delega para módulo especializado
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
            // GroupElement precisa da função factory para recursão
            return criarGrupo(elementObject, criarElemento);
            
        case 'InfoBoxElement':
            // InfoBox precisa da função do modal
            return criarGatilhoInfoBox(elementObject, abrirModal);
            
        case 'SpacerElement':
            return criarEspacador(elementObject);
            
        case 'AppLauncherElement':
            return criarAppLauncher(elementObject);
            
        default:
            console.warn(`Tipo de elemento não suportado: ${elementObject.type}`);
            return null;
    }
}