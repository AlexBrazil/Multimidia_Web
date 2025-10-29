# Manual do AccordionInfoElement

## 1. Visão geral
- **Recurso:** `AccordionInfoElement` apresenta perguntas e respostas ou blocos informativos em um acordeão responsivo.
- **Arquivos envolvidos:** `js/elements/accordion-info-element.js` (componente) e `css/elements/accordion-info-element.css` (estilos). O renderizador principal precisa importar e expor o criador.
- **Objetivo didático:** organizar conteúdos densos em tópicos expansíveis, reduzindo o scroll e mantendo acessibilidade compatível com teclado/leitores de tela.

## 2. Estrutura básica no `data.json`
Cada acordeão é descrito por um objeto semelhante ao exemplo a seguir:

```json
{
  "type": "AccordionInfoElement",
  "title": "Dúvidas frequentes",
  "options": {
    "accordion": true,
    "dense": false,
    "numbered": true
  },
  "items": [
    {
      "title": "Qual a documentação necessária?",
      "html": "<p>RG, CPF e comprovante de residência.</p>",
      "icon": "assets/icons/info.svg",
      "defaultOpen": true
    }
  ]
}
```

## 3. Campos principais
- `type` (obrigatório): deve ser exatamente `"AccordionInfoElement"` para que o factory selecione o componente.
- `title` (opcional): título exibido acima do acordeão.
- `items` (array): lista de objetos, cada qual representa uma seção expansível. O componente aceita array vazio, mas não exibirá conteúdo.

### Estrutura de cada item
- `title` (string): texto do cabeçalho. Se `numbered=true`, o índice é prefixado automaticamente.
- `html` (string): corpo do conteúdo já sanitizado; renderizado via `innerHTML`.
- `icon` (string): pode ser um caminho (mostra `<img>`) ou texto/emoji (renderizado em `<span>`). Se omitido, o slot some.
- `defaultOpen` (boolean): abre o painel por padrão e define `aria-expanded="true"`.

## 4. Opções disponíveis (`options`)
| Opção | Tipo | Padrão | Efeito |
|-------|------|--------|--------|
| `accordion` | boolean | `true` | Mantém somente um item aberto por vez. Se `false`, múltiplos podem ficar expandidos. |
| `dense` | boolean | `false` | Aplica classes adicionais para reduzir paddings (`accordion--dense`). |
| `numbered` | boolean | `false` | Prefixa títulos com contagem sequencial (`1.`, `2.`, …). |

## 5. Funcionamento interno
1. `criarAccordionInfo` gera um `<section>` que recebe classes conforme as opções.
2. Cada item vira um `<li>` com botão `.acc-head` e painel `.acc-panel` vinculado via `aria-controls`/`aria-labelledby`.
3. A lógica de `toggleItem` garante sincronia entre `aria-expanded`, classes CSS e fechamento dos irmãos quando `accordion=true`.
4. `watchMediaForResize` adiciona listeners em mídia (imagens, vídeos, iframes) disparando `atualizarAlturaDoContainer()` ao carregar.
5. Um `ResizeObserver` observa a lista e o container para manter o fluxo de layout do slide.

## 6. Acessibilidade e interação
- Botões usam `type="button"`, recebem foco nativo e respeitam `Enter/Espaço`.
- `aria-expanded` e `aria-controls` informam o estado aos leitores de tela.
- Painéis possuem `role="region"` para anunciar a área expandida.
- Ícones texto/emoji adicionam `aria-hidden="true"` para não poluir a leitura.
- `defaultOpen=true` adiciona classe `is-open` para setar estado inicial visual e semântico.

## 7. Estilos e personalização
- Arquivo `css/elements/accordion-info-element.css` define variáveis (`--acc-*`) para borda, cores, sombras e foco.
- `.accordion-info` é o container raiz; `.accordion--dense` diminui paddings.
- O chevron padrão (`.acc-chevron`) gira 180 graus usando `transform` quando o item está aberto.
- Painel (`.acc-panel`) aceita HTML rico; imagens herdam `max-width: 100%` e recebem bordas arredondadas.
- Para integrar o estilo, importe o CSS no bundle principal ou adicione `@import "elements/accordion-info-element.css";` ao stylesheet global.

## 8. Boas práticas de conteúdo
- Escreva títulos curtos (<= 70 caracteres) para evitar truncamento em mobile.
- Prefira `html` simples; caso inclua listas ou tabelas, teste em telas menores.
- Sanitizar qualquer HTML proveniente de autores externos antes de inserir no JSON.
- Ícones SVG devem ter `viewBox` compatível e fundo transparente para combinar com o padrão do slot.
- Evite mais de 6 itens por acordeão; se houver excesso, divida em tópicos múltiplos ou use `accordion=false`.

## 9. Fluxo de implementação
1. Criar/atualizar o objeto no `data.json` com `type: "AccordionInfoElement"`.
2. Garantir que `js/renderer.js` importe `criarAccordionInfo` e contenha `case 'AccordionInfoElement':` retornando o componente.
3. Incluir o CSS correspondente no arquivo global carregado pela aplicação.
4. Revisar no navegador em resoluções mobile e desktop; validar navegação via teclado (Tab/Enter/Espaço).
5. Ajustar variáveis CSS se necessário para aderir à identidade visual.

## 10. Solução de problemas
- **Nada aparece no slide:** verifique o `switch` do renderizador; sem o `case` ou `import`, o factory retorna `null`.
- **Caracteres "�" no JSON:** encode o arquivo em UTF-8 (`Set-Content -Encoding UTF8`).
- **Painel sem estilo:** confirme se o CSS foi incorporado ao bundle principal ou se a ordem de carregamento respeita o novo arquivo.
- **Accordion não fecha itens anteriores:** revise `options.accordion`; se definido como `false`, o comportamento é deliberado.
- **Ícone não exibe:** caminhos relativos precisam existir dentro de `assets/`. Para emojis, use caracteres suportados pelo tipo de fonte.

## 11. Checklist antes da publicação
- [ ] JSON validado com `type`, `items` e `options` corretos.
- [ ] Import e `case` adicionados no `renderer.js`.
- [ ] CSS incluído no pipeline.
- [ ] Testes manuais em teclado e leitor de tela (NVDA/VoiceOver) executados.
- [ ] Conteúdo revisado por equipe pedagógica.

## 12. Referências rápidas
- JS: `js/elements/accordion-info-element.js`
- CSS: `css/elements/accordion-info-element.css`
- Renderizador: `js/renderer.js`
- Dados: `data.json`
