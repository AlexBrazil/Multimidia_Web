# Manual tecnico - arquitetura do projeto multimidia_auth

## 1) Visao geral
- Projeto Django (apps/accounts, apps/conteudo, apps/legal) com front-end estatico em templates e JS.
- O curso e renderizado no browser a partir de um JSON protegido (protected/data.json).
- Assets estaticos (imagens, audio, css, js) ficam em static/.

## 2) Estrutura de pastas (alto nivel)
- core/: settings, urls, wsgi/asgi.
- apps/accounts/: autenticacao, cadastro, recuperacao, modelos de usuario e progresso.
- apps/conteudo/: endpoints do curso (index, data.json, progresso).
- apps/legal/: paginas de termos e privacidade.
- templates/: HTML para o portal e telas de conta.
- static/: JS/CSS dos elementos e assets.
- protected/data.json: conteudo do curso.

## 3) Arquitetura e comunicacao entre partes
### 3.1 Backend -> Frontend
- templates/index.html injeta window.APP_ENDPOINTS e window.APP_USER.
- static/js/main.js usa esses endpoints para buscar data.json e registrar progresso.

### 3.2 Fluxo principal
1. Usuario autenticado acessa / -> apps.conteudo.views.index -> templates/index.html.
2. main.js faz fetch em /data.json -> apps.conteudo.views.course_data.
3. renderer.js monta o slide e chama os elementos de static/js/elements.
4. Quando o modo e MONITORED, main.js calcula tempo e interacoes e envia POST /progress/interaction/.
5. apps.conteudo.views.progress_interaction persiste em UserProgress e atualiza UserProfile.

### 3.3 Fluxo de cadastro e acesso
- Cadastro: forms em apps/accounts/forms/*.py e views em apps/accounts/views/register.py.
- Login/Logout: apps/accounts/views/auth.py com LoginView e LogoutView.
- Recuperacao: apps/accounts/views/reset.py cria ShortLink e aciona webhook n8n.

## 4) Seguranca
- core/settings.py usa DJANGO_SECRET_KEY, DEBUG, ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS.
- Cookies seguros em producao: SESSION_COOKIE_SECURE e CSRF_COOKIE_SECURE quando DEBUG=0.
- HSTS e SSL redirect controlados por variaveis DJANGO_SECURE_*.
- Endpoints de curso e progresso usam @login_required.
- progress_interaction valida slideId contra IDs reais do data.json.
- Recuperacao de senha:
  - PasswordResetRequestView usa default_token_generator.
  - Cria ShortLink (expira e uso unico).
  - Envia via webhook n8n (N8N_WEBHOOK_URL + token).
  - Form de reset nao revela se o email existe.
- Observacao: assets em static/ sao publicos; a protecao principal e sobre o JSON do curso.

## 5) Models
### CustomUser (apps/accounts/models.py)
- Usa email como USERNAME_FIELD.
- Campos: id (UUID), email, username, role, is_active, is_staff, date_joined.
- Roles: EDITORA, GESTOR, ALUNO.

### UserProfile
- OneToOne com CustomUser.
- Campos de cadastro (cpf/cnpj, endereco, whatsapp, etc).
- progress_mode: FREE ou MONITORED.
- last_viewed_slide_id, last_completed_slide_id, last_interaction_at.

### UserProgress
- FK para CustomUser + slide_id.
- elements armazena resumo de interacoes.
- time_met, required_seconds, completed, timestamps.

### ShortLink
- code, target_path, email, whatsapp, expires_at, used_at.
- new() gera link curto seguro com TTL.
- is_valid() valida expiracao e uso.

## 6) Views e URLs
### core/urls.py
- admin/
- inclui apps: accounts, conteudo, legal

### apps/conteudo/urls.py
- / -> index
- /data.json -> course_data
- /progress/ -> progress_overview
- /progress/interaction/ -> progress_interaction

### apps/accounts/urls.py
- /login/, /logout/
- /register/... (aluno/gestor PF/PJ) + /register/sucesso/
- /terms/ (termos de cadastro)
- /recovery/request/ (form novo)
- /recovery/ -> redirect para request
- /recovery/unavailable/
- /r/<code>/ -> ShortLink router
- /conta/reset/<uidb64>/<token>/ -> PasswordResetConfirmView

### apps/legal/urls.py
- /politica-de-privacidade/ -> TemplateView
- /termos-de-servico/ -> TemplateView

## 7) Templates
- templates/index.html: layout principal do curso, menu, modal, busca, controles de audio e JS principal.
- templates/accounts/login.html: tela de login.
- templates/accounts/register/*: fluxo de cadastro (form_base + variantes).
- templates/accounts/recovery/*: request e reset confirm.
- templates/legal/*.html: termos e privacidade.

## 8) Front-end (JS e CSS)
### static/js/main.js
- Carrega data.json, valida IDs unicos.
- Cria menu recursivo e gerencia navegacao.
- Modo MONITORED: exige tempo minimo e interacoes (accordion, cardImage, compareSlider, infobox, quiz, timeline, video).
- Busca full-text nos slides (coleta textos por chaves e normaliza acentos).
- Envia progresso via POST com CSRF.

### static/js/renderer.js
- Responsavel por:
  - Atualizar titulo, subtitulo e audio do slide.
  - Renderizar elementos chamando a factory criarElemento.
- Importa todos os elementos de static/js/elements.

### static/js/utils/asset-path.js
- Resolve caminhos para assets usando window.APP_STATIC_PREFIX.
- Se o caminho ja for absoluto, nao altera.
- Normaliza assets/images, assets/audio, assets/videos.

### CSS
- Base: static/css/core/base.css, static/css/core/responsive.css.
- Por elemento: static/css/elements/*.css.

## 9) Estrutura do data.json
- Arquivo em protected/data.json.
- Estrutura hierarquica de SlideGroup -> SlideGroup -> Slide.

Exemplo simplificado:
```json
{
  "id": 1,
  "productId": "000001",
  "title": "Curso X",
  "type": "SlideGroup",
  "items": [
    {
      "id": 2,
      "title": "Modulo 1",
      "type": "SlideGroup",
      "items": [
        {
          "id": 10,
          "type": "Slide",
          "title": "Titulo do slide",
          "subtitle": "Subtitulo",
          "audio": "arquivo.mp3",
          "bookReference": "23",
          "time": 10,
          "elements": [
            { "type": "TextElement", "styleName": "title1", "text": "..." }
          ]
        }
      ]
    }
  ]
}
```

Notas:
- requiredSeconds ou minDuration (se presentes no slide) alimentam o modo MONITORED.
- bookReference e time existem no JSON atual, mas nao sao consumidos no JS.
- Os elementos sao objetos com type e campos especificos por componente.

## 10) Catalogo de elementos (static/js/elements)
Abaixo, um resumo por arquivo e estrutura JSON esperada.

### base.js (utilitario)
- Cria indicador de scroll e atualiza altura do container.
- Atualiza variaveis CSS de viewport (--app-height, --safe-area-bottom-extra).

### TextElement (text-element.js)
Campos:
- type: "TextElement"
- text: texto exibido.
- styleName: classe CSS (ex.: title1, title2, paragraph, caption).
- textKey (opcional): chave estavel para data-textkey.

Render:
- <p class="text-element {styleName}">.

### ListElement (list-element.js)
Campos:
- type: "ListElement"
- styleName: unorderedList ou numberList.
- text: itens separados por \n.
- startIndex (opcional, para listas numeradas).

### ImageElement (image-element.js)
Campos:
- type: "ImageElement"
- source: arquivo da imagem.
- title, legend, searchText.
- width, height (px).
- fullSizeSource (quando usado por outros elementos).

### VideoElement (video-element.js)
Campos:
- type: "VideoElement"
- video: URL do video (YouTube ou mp4/webm/ogv/ogg).
- previewImage (opcional).
- title.
- start_time e start_end (opcionais, segundos).

Comportamento:
- YouTube usa IFrame API com controles customizados.
- Media direta usa <video> HTML5.
- Fallback abre link externo.

### GridElement (grid-element.js)
Campos:
- type: "GridElement"
- content: matriz (linhas x colunas).
- isFirstRowHeader: usa primeira linha como cabecalho.
- columnSizes: pesos para largura percentual.
- columnNumber (opcional).
- featureColumn (coluna destacada).
- alternateRowColor.

### GroupElement (group-element.js)
Campos:
- type: "GroupElement"
- elements: lista de elementos filhos.
- mode: horizontalGroup ou verticalGroup.
- horizontalAlign: left/center/right.
- verticalAlign: top/middle/bottom.
- fillHeight: expande altura.

### SpacerElement (spacer-element.js)
Campos:
- type: "SpacerElement"
- width, height (px).

### InfoBoxElement (infobox-element.js)
Campos:
- type: "InfoBoxElement"
- title: titulo do modal.
- elements: conteudo do modal (lista de elementos).
- triggerContent: texto do botao (padrao "i").
- anchorMode: auto-prev (padrao), container ou flow-end.
- anchorCorner: top-right, top-left, bottom-right, bottom-left.
- anchorSelector (ou anchorElement), x, y para ajuste fino.

Comportamento:
- flow-end empilha botoes em um dock no fim do slide.
- Demais modos posicionam o botao relativo ao elemento alvo.

### AppLauncherElement (app-launcher.js)
Campos:
- type: "AppLauncherElement"
- path: URL do app externo.
Render:
- Link com target=_blank e rel=noopener.

### CardImageElement (card-image-element.js)
Campos principais:
- type: "CardImageElement"
- source, title, alt.
- radius, useMask, borderWidth, borderColor, shadow.
- maxWidth, aspectRatio.
- caption ou captionElement (TextElement).
- openBehavior: modal, zoom, none.
- modalTitle, modalElements, fullSizeSource.
- clickSound (src/volume).
- imageKey, captionKey.
- interactionHint + textos, showInfoBadge, badgePosition.

### TimelineElement (timeline-element.js)
Campos:
- type: "TimelineElement"
- title
- orientation: vertical, horizontal, auto.
- options: dense, accordion, numbered.
- items: lista com:
  - label, sub ou title
  - description ou html
  - media, alt
  - icon
  - defaultOpen

### AccordionInfoElement (accordion-info-element.js)
Campos:
- type: "AccordionInfoElement"
- title
- items: { title, html, icon, defaultOpen }
- options: { accordion, dense, numbered }

### CompareSliderElement (compare-slider-element.js)
Campos:
- type: "CompareSliderElement"
- before: { src, alt }
- after: { src, alt }
- beforeLabel, afterLabel
- position (0-100)
- height, caption, id

### QuizMCQElement (quiz-mcq-element.js)
Campos:
- type: "QuizMCQElement"
- question, options, correctIndex
- feedbackCorrect, feedbackWrong
- shuffle, speakFeedback
- questionImage, questionImageAlt, questionImageCaption
- imagePlacement (top/left), imageObjectFit

## 11) Observacoes operacionais
- core/settings.py usa dj_database_url; em dev padrao e SQLite.
- .env.prod.example mostra variaveis recomendadas para producao.
- staticfiles e media foram configurados para deploy com NGINX.
