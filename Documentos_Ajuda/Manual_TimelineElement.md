# Manual do TimelineElement

## 1. Visão geral

-   **Recurso:** `TimelineElement` renderiza uma linha do tempo
    responsiva com cartões expansíveis.\
-   **Dependências diretas:** `js/elements/timeline-element.js`,
    `css/elements/timeline-element.css` e os dados definidos em
    `data.json`.\
-   **Objetivo:** contar uma sequência de eventos com textos curtos,
    mídia opcional e indicador visual contínuo.

## 2. Estrutura nos dados

Cada item do timeline no `data.json` precisa seguir o formato abaixo:

``` json
{
  "type": "TimelineElement",
  "title": "Evolução do Cinto de Segurança",
  "orientation": "auto",            // vertical, horizontal ou auto
  "options": {
    "dense": false,
    "accordion": false,
    "numbered": false
  },
  "items": [
    {
      "label": "1950",
      "title": "Primeiras versões",
      "sub": "Texto curto opcional", // também aceitamos "title" ou "sub"
      "description": "Descrição longa.",
      "media": "assets/images/cinto_1950.jpg",
      "alt": "Texto alternativo",
      "defaultOpen": false
    }
  ]
}
```

### Campos relevantes

-   `label` (string curta) aparece à esquerda do cartão.\
-   `sub` ou `title` (string) vira o subtítulo do botão.\
-   `description` (string) alimenta o corpo textual quando não usamos
    `html`.\
-   `media` (string) é opcional, mas exige caminho real em
    `assets/images`.\
-   `defaultOpen` define se o item inicia expandido.\
-   `icon` aceita um caminho para ícones pequenos (32 px).

### Orientação

-   `vertical`: layout em coluna (padrão).\
-   `horizontal`: força cartões lado a lado.\
-   `auto`: usa vertical em telas \< 880 px e horizontal acima disso.

## 3. Interação e acessibilidade

-   Botões `.timeline-head` têm `aria-expanded` e `aria-controls`
    controlados em `timeline-element.js`.\
-   Opção `accordion=true` fecha os demais itens quando um é aberto.\
-   Eventos com corpo vazio são desativados automaticamente.

## 4. Estilos principais (`css/elements/timeline-element.css`)

-   Variáveis CSS (`--tl-*`) controlam paleta: ajuste aqui para alterar
    o visual global.\
-   `.timeline-head`: botão com gradiente claro, borda suave e grid para
    label/sub/chevron.\
-   `.timeline-body`: bloco expandido com borda lateral; aceita HTML via
    `item.html`.\
-   `.timeline-list[data-orientation='horizontal']`: cria linha contínua
    e define largura mínima de 280 px por cartão.

### Adaptações rápidas

-   **Alterar cores:** edite as variáveis no seletor
    `.timeline-element`.\
-   **Diminuir espaçamento:** reduza `gap` em `.timeline-list` ou o
    `padding` em `.timeline-head`.\
-   **Remover gradiente:** troque o `background` do container e dos
    botões.

## 5. Fluxo de edição

1.  Abra `data.json` e localize o slide que receberá o
    `TimelineElement`.\
2.  Garanta que os caminhos de mídia existam em `assets/images` ou
    ajuste o JSON.\
3.  Revise o resultado no navegador (desktop + mobile) para validar o
    alinhamento.\
4.  Ajuste o CSS se precisar adequar ao tema geral.

## 6. Boas práticas

-   Use frases curtas no `label` para não quebrar o layout em mobile.\
-   Prefira uma imagem leve (\< 300 KB) por evento para não travar o
    carregamento.\
-   Sempre forneça `alt` para imagens; o componente mantém os atributos
    no DOM.\
-   Quando precisar de markup avançado, use `item.html` com o HTML já
    sanitizado.\
-   Evite mais de 6 itens em horizontal: considere dividir em duas
    timelines.

## 7. Referências rápidas

-   Arquivo JS: `js/elements/timeline-element.js`\
-   Estilos: `css/elements/timeline-element.css`\
-   Exemplo prático: `data.json` (slide de ID 61 com o timeline de
    **"Evolução do Cinto de Segurança"**).\
-   Suporte visual: quaisquer ajustes adicionais podem ser testados via
    DevTools antes de alterar os arquivos.
