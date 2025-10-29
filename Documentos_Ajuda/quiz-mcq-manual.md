# Manual do QuizMCQElement

## 1. Visão geral
- **Recurso:** `QuizMCQElement` cria um quiz de múltipla escolha com feedback imediato, suporte a teclado e leitura opcional do resultado.
- **Arquivos envolvidos:** `js/elements/quiz-mcq-element.js` (lógica) e `css/elements/quiz-mcq-element.css` (estilos). O renderizador deve importar `criarQuizMCQ`.
- **Uso ideal:** verificar aprendizagem em slides sem sair do fluxo do conteúdo, destacando visualmente acertos/erros.

## 2. Estrutura no `data.json`
Exemplo completo:

```json
{
  "type": "QuizMCQElement",
  "id": "quiz-prioridade",
  "question": "Quem tem prioridade nesta interseção sem sinalização?",
  "questionImage": "assets/images/116-3.jpg",
  "questionImageAlt": "Carro laranja e carro cinza chegando a um cruzamento",
  "questionImageCaption": "Observe que o veículo da direita tem a preferência.",
  "imagePlacement": "top",
  "options": [
    { "text": "O veículo que vem da esquerda." },
    { "text": "O veículo que vem da direita." },
    { "text": "O veículo maior." },
    { "text": "O que buzinar primeiro." }
  ],
  "correctIndex": 1,
  "feedbackCorrect": "Correto! A prioridade é de quem vem da direita.",
  "feedbackWrong": "Revise a regra de preferência em interseções sem sinalização.",
  "shuffle": true,
  "speakFeedback": true
}
```

### Campos obrigatórios
- `type`: sempre `"QuizMCQElement"`.
- `question`: texto da pergunta.
- `options`: array de objetos com `text` (string). Ao menos duas opções.
- `correctIndex`: índice (base 0) da opção correta.

### Campos opcionais
- `id`: âncora para linkagem.
- `feedbackCorrect` / `feedbackWrong`: textos exibidos após a resposta. Defaults: "Muito bem!" e "Tente novamente!".
- `shuffle`: embaralha opções (mantém referência para correção).
- `speakFeedback`: usa `speechSynthesis` quando disponível.
- `questionImage`: caminho para imagem ilustrativa.
- `questionImageAlt`: texto alternativo.
- `questionImageCaption`: legenda sob a figura.
- `imagePlacement`: `"top"` (padrão) ou `"left"` para layout em grid.
- `imageObjectFit`: controla o `object-fit` da imagem (`"contain"` por padrão) caso precise outro comportamento.

## 3. Funcionamento interno
1. `criarQuizMCQ` monta um `<section class="quiz-mcq">` contendo cabeçalho, lista de opções e feedback.
2. Se houver imagem, cria um `<figure class="quiz-media">` e posiciona conforme `imagePlacement`. O `object-fit` padrão preserva a proporção, adicionando barras quando necessário.
3. As opções renderizam como `<li class="quiz-option">` com rótulos A, B, C… gerados automaticamente.
4. Ao selecionar uma opção (clique, Enter ou Espaço), o componente:
   - trava novas interações;
   - aplica classe `correct` ou `wrong` à opção escolhida e adiciona `disabled` às demais;
   - popula o bloco `.quiz-feedback` e ativa a cor correspondente;
   - opcionalmente executa síntese de voz do feedback.
5. `shuffle=true` embaralha visualmente as alternativas sem perder o índice original para conferência.

## 4. Estilos principais (`quiz-mcq-element.css`)
- Container dark com `border-radius`, `box-shadow` e `max-width: 600px`.
- `.quiz-options` é flex column; `.quiz-option` muda cor/elevação no hover/focus.
- Estados `correct` (verde) e `wrong` (vermelho) destacam a resposta.
- `.quiz-media` usa flexbox para centralizar a imagem e `object-fit: contain` (sem distorção), com fundo escuro para “barras”.
- `.quiz-mcq.has-media-left` aplica grid 1fr/2fr no cabeçalho para layouts horizontais.

## 5. Boas práticas
- Garanta que as opções sejam mutuamente exclusivas para evitar ambiguidades.
- Use feedbacks específicos que reforcem a explicação (não só "Certo"/"Errado").
- Forneça `questionImageAlt` descritivo; leitores de tela dependem desse texto.
- Evite textos muito longos nas opções; quebre em mais perguntas quando necessário.
- Teste o componente com teclado para assegurar acessibilidade.

## 6. Customizações rápidas
- **Alterar cores:** sobrescreva variáveis ou classes (`.quiz-option.correct`, `.quiz-feedback.correct`, etc.) em um CSS global.
- **Layout compacto:** reduza `padding`/`gap` no container e nas opções.
- **Imagem na lateral:** defina `"imagePlacement": "left"` e ajuste `quiz-media img` para a altura desejada (via CSS ou `imageObjectFit`).

## 7. Fluxo de implementação
1. Inserir o objeto no `data.json` conforme a estrutura acima.
2. Garantir que `js/renderer.js` tenha `import { criarQuizMCQ }` e `case 'QuizMCQElement': return criarQuizMCQ(elementObject);`.
3. Certificar-se de que `css/elements/quiz-mcq-element.css` esteja no bundle principal.
4. Testar em diferentes resoluções e com `shuffle` ativado para garantir que o layout comporte todas as opções.
5. Validar áudio de feedback se `speakFeedback` estiver habilitado (especialmente em navegadores que exigem interação prévia para TTS).

## 8. Diagnóstico rápido
- **Imagem não aparece:** verifique caminho, permissões e se `questionImage` foi enviado corretamente; após a correção recente o código injeta a figura para ambos os placements.
- **Opções não reagem:** confirme que o componente está no `switch` do renderizador e que não há elemento sobreposto capturando cliques.
- **Feedback não fala:** confira suporte a `window.speechSynthesis` no navegador e se o usuário já interagiu (alguns bloqueiam autoplay de áudio).
- **Layout quebrado ao usar imagem lateral:** ajuste a altura no CSS (`.quiz-media img { height: ... }`) ou garanta proporção semelhante ao conteúdo textual.

## 9. Referências rápidas
- JS: `js/elements/quiz-mcq-element.js`
- CSS: `css/elements/quiz-mcq-element.css`
- Exemplo em produção: `data.json` (procure por `quiz-prioridade`).
