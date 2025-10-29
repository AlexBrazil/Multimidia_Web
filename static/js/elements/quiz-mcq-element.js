/**
 * quiz-mcq-element.js
 * Agora com suporte a imagem na pergunta (questionImage).
 */

export function criarQuizMCQ(data) {
  const {
    question = "Pergunta nÃ£o definida",
    options = [],
    correctIndex = 0,
    feedbackCorrect = "Muito bem!",
    feedbackWrong = "Tente novamente!",
    shuffle = false,
    speakFeedback = false,

    // ðŸ‘‡ novo bloco (todos opcionais)
    questionImage,              // ex.: "assets/images/pergunta1.jpg"
    questionImageAlt = "",      // texto alternativo (acessibilidade)
    questionImageCaption = "",  // legenda opcional
    imagePlacement = "top",     // "top" (padrÃ£o) | "left"
    imageObjectFit = "contain"    // "cover" (padrÃ£o) | "contain"
  } = data;

  // embaralhar opÃ§Ãµes (mantendo Ã­ndice original para conferir correÃ§Ã£o)
  const shuffled = shuffle
    ? options.map((opt, i) => ({ ...opt, idx: i })).sort(() => Math.random() - 0.5)
    : options.map((opt, i) => ({ ...opt, idx: i }));

  const wrapper = document.createElement("section");
  wrapper.className = "quiz-mcq";
  if (questionImage && imagePlacement === "left") {
    wrapper.classList.add("has-media-left");
  }

  // Header: pergunta + (opcional) mÃ­dia
  const header = document.createElement("div");
  header.className = "quiz-header";
  wrapper.appendChild(header);

  // MÃ­dia da pergunta (opcional)
  let mediaEl = null;
  if (questionImage) {
    mediaEl = document.createElement("figure");
    mediaEl.className = "quiz-media";
    // imagem
    const img = document.createElement("img");
    img.src = questionImage;
    img.alt = questionImageAlt || "";
    img.loading = "lazy";
    img.decoding = "async";
    img.style.objectFit = imageObjectFit;
    mediaEl.appendChild(img);
    // legenda (opcional)
    if (questionImageCaption) {
      const figcap = document.createElement("figcaption");
      figcap.className = "quiz-media-caption";
      figcap.textContent = questionImageCaption;
      mediaEl.appendChild(figcap);
    }
    // posiÃ§Ã£o
    if (imagePlacement === "left") {
      header.appendChild(mediaEl);
    } else {
      header.prepend(mediaEl);
    }
  }

  // TÃ­tulo/pergunta
  const qTitle = document.createElement("h3");
  qTitle.className = "quiz-question";
  qTitle.textContent = question;
  header.appendChild(qTitle);

  // Se a imagem ficar no topo (padrÃ£o)
  if (questionImage && imagePlacement !== "left" && mediaEl === null) {
    mediaEl = document.createElement("figure");
    mediaEl.className = "quiz-media";
    const img = document.createElement("img");
    img.src = questionImage;
    img.alt = questionImageAlt || "";
    img.loading = "lazy";
    img.decoding = "async";
    img.style.objectFit = imageObjectFit;
    mediaEl.appendChild(img);
    if (questionImageCaption) {
      const figcap = document.createElement("figcaption");
      figcap.className = "quiz-media-caption";
      figcap.textContent = questionImageCaption;
      mediaEl.appendChild(figcap);
    }
    // no topo: media acima do tÃ­tulo
    header.prepend(mediaEl);
  }

  // Lista de opÃ§Ãµes
  const list = document.createElement("ul");
  list.className = "quiz-options";
  wrapper.appendChild(list);

  // Feedback
  const feedback = document.createElement("div");
  feedback.className = "quiz-feedback";
  wrapper.appendChild(feedback);

  // estado
  let answered = false;

  function speak(text) {
    if (!speakFeedback || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    window.speechSynthesis.speak(utter);
  }

  shuffled.forEach((opt, i) => {
    const li = document.createElement("li");
    li.className = "quiz-option";
    li.tabIndex = 0;
    li.innerHTML = `
      <span class="quiz-letter">${String.fromCharCode(65 + i)}</span>
      <span class="quiz-text">${opt.text}</span>
    `;
    list.appendChild(li);

    const checkAnswer = () => {
      if (answered) return;
      answered = true;

      const isCorrect = opt.idx === correctIndex;

      li.classList.add(isCorrect ? "correct" : "wrong");
      feedback.textContent = isCorrect ? feedbackCorrect : feedbackWrong;
      feedback.className = "quiz-feedback " + (isCorrect ? "correct" : "wrong");

      // desativa demais
      list.querySelectorAll(".quiz-option").forEach(o => {
        o.classList.add("disabled");
        o.tabIndex = -1;
      });

      speak(feedback.textContent);
    };

    li.addEventListener("click", checkAnswer);
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        checkAnswer();
      }
    });
  });

  return wrapper;
}




