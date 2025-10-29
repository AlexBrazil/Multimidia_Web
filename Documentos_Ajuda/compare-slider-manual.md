# Manual do CompareSliderElement

## 1. Visão geral
- **Recurso:** `CompareSliderElement` exibe duas imagens sobrepostas com uma alça deslizante que permite comparar visuais "Antes/Depois".
- **Arquivos envolvidos:** `js/elements/compare-slider-element.js` (lógica) e `css/elements/compare-slider-element.css` (estilos). Certifique-se de importar o módulo no `renderer.js`.
- **Objetivo pedagógico:** destacar diferenças sutis entre situações, correções ou evoluções sem exigir slides duplicados.

## 2. Estrutura no `data.json`
Exemplo básico de configuração:

```json
{
  "type": "CompareSliderElement",
  "id": "comparacao-exemplo",
  "before": {
    "src": "assets/images/certo.jpg",
    "alt": "Manobra correta"
  },
  "after": {
    "src": "assets/images/errado.jpg",
    "alt": "Manobra incorreta"
  },
  "beforeLabel": "CORRETO",
  "afterLabel": "ERRADO",
  "position": 55,
  "caption": "Deslize para comparar"
}
```

### Campos obrigatórios
- `type`: deve ser `"CompareSliderElement"` para o factory reconhecê-lo.
- `before.src` / `after.src`: caminhos válidos no diretório `assets/images`.

### Campos opcionais
- `id`: âncora única para navegação interna.
- `before.alt` / `after.alt`: textos alternativos (recomendado para acessibilidade).
- `beforeLabel` / `afterLabel`: etiquetas exibidas nos cantos superior esquerdo/direito.
- `position`: porcentagem inicial (0 a 100). Padrão: 50.
- `height`: altura máxima do quadro (ex.: "360px"). Se omitido, a altura acompanha a proporção natural das imagens.
- `caption`: legenda exibida abaixo.

## 3. Como o componente funciona
1. Dois `<img>` são empilhados dentro de `.cmp-frame`; a camada "depois" é revelada via `clip-path` controlado pela variável CSS `--pos`.
2. A largura máxima é calculada a partir das dimensões naturais das imagens; se elas forem discrepantes, o console recebe um aviso, mas o componente continua funcionando usando a menor proporção.
3. A alça (`.cmp-handle`) responde a arrasto, clique em qualquer ponto da moldura e teclado (`ArrowLeft/Right`, `Home`, `End`).
4. A posição é refletida em `aria-valuenow` para leitores de tela.

## 4. Estilos principais
- Variáveis base (`--cmp-*`) ajustam tamanho, paleta e sombras.
- `.cmp-tag` define os rótulos e pode ser sobrescrita em um stylesheet global para personalizar cores.
- `.cmp-caption` lida com texto abaixo do slider.
- `clip-path` garante que as imagens não sejam redimensionadas ao mover a alça, apenas mascaradas.

## 5. Boas práticas de conteúdo
- Use imagens com mesmas dimensões ou proporções; isso evita caixas vazias ou avisos no console.
- Prefira PNG/JPG otimizados para garantir carregamento rápido antes do usuário interagir.
- Forneça descrições de contexto no `alt` para quem utiliza leitores de tela.
- Evite textos importantes embutidos apenas em um estado da comparação – eles podem ficar parcialmente encobertos.

## 6. Propriedades dinâmicas (customização avançada)
- `--cmp-max-width`: largura máxima em pixels derivada das imagens. Pode ser sobrescrita manualmente em CSS se desejar limitar ainda mais o tamanho.
- `--cmp-max-height`: altura máxima quando `height` é informada no JSON. Útil para harmonizar com outros elementos do slide.
- `--cmp-aspect`: razão largura/altura aplicada no `aspect-ratio`. Ajuste apenas se quiser forçar uma proporção diferente da inferida.
- `--handle-bg`, `--line`, `--tag-bg`: personalize temas claros/escuros para alinhar com a identidade visual.

## 7. Exemplos de uso

### 7.1 Comparação simples com posição padrão
```json
{
  "type": "CompareSliderElement",
  "before": { "src": "assets/images/projeto_v1.jpg", "alt": "Layout inicial" },
  "after": { "src": "assets/images/projeto_v2.jpg", "alt": "Layout revisado" },
  "beforeLabel": "Versão 1",
  "afterLabel": "Versão 2"
}
```

### 7.2 Ajustando altura máxima e posição inicial
```json
{
  "type": "CompareSliderElement",
  "id": "maquete-3d",
  "before": { "src": "assets/images/maquete-dia.jpg" },
  "after": { "src": "assets/images/maquete-noite.jpg" },
  "position": 70,
  "height": "320px",
  "caption": "Ajuste o slider para ver a iluminação do projeto"
}
```

### 7.3 Sem rótulos, com legenda explicativa
```json
{
  "type": "CompareSliderElement",
  "before": { "src": "assets/images/antes.png", "alt": "Imagem original" },
  "after": { "src": "assets/images/depois.png", "alt": "Imagem tratada" },
  "caption": "Tratamento de contraste aplicado para destacar os elementos principais."
}
```

## 8. Fluxo de implementação
1. Adicione o objeto ao `data.json` conforme os exemplos.
2. Garanta que `js/renderer.js` importe `criarCompareSlider` e contenha `case 'CompareSliderElement':`.
3. Inclua `css/elements/compare-slider-element.css` no bundle global.
4. Teste em diferentes larguras de tela para garantir que o layout se adapte e que o `clip-path` funcione no navegador alvo.
5. Revise com teclado e leitor de tela para confirmar a acessibilidade.

## 9. Solução de problemas
- **Slider ocupa largura excessiva:** use o campo `height` ou defina um `max-width` customizado no CSS.
- **Imagens aparecem cortadas:** verifique se os arquivos têm proporção similar; diferenças grandes geram corte visual e um alerta no console.
- **Alça não responde:** confirme que não existe camada HTML transparente bloqueando o `pointerdown` e que o JS foi importado corretamente.
- **Caminho inválido:** o componente loga warnings no console quando `before.src` ou `after.src` não são encontrados.

## 10. Referências rápidas
- JS: `js/elements/compare-slider-element.js`
- CSS: `css/elements/compare-slider-element.css`
- Dados de exemplo: `data.json` (procure pelo ID `covresao-01`)
