// =====================================================
// LÓGICA GENERAL: NAVEGACIÓN ENTRE PANTALLAS
// =====================================================

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function showView(containerSelector, viewId) {
  document.querySelectorAll(containerSelector + ' .view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

document.getElementById('btn-go-math').addEventListener('click', () => showScreen('math-game'));
document.getElementById('btn-go-reading').addEventListener('click', () => showScreen('reading-game'));

document.querySelectorAll('.btn-back').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.target));
});

// Utilidad: mezclar un array (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// =====================================================
// JUEGO DE MATEMÁTICAS
// =====================================================

const mathState = {
  score: 0,
  hearts: 3,
  level: 1,
  currentAnswer: 0,
  userInput: ''
};

function mathGenerateQuestion() {
  let num1, num2, operation;

  if (mathState.level === 1) {
    num1 = Math.floor(Math.random() * 44) + 11;
    num2 = Math.floor(Math.random() * (99 - num1 - 9)) + 11;
    operation = '+';
  } else if (mathState.level === 2) {
    num1 = Math.floor(Math.random() * 54) + 15;
    num2 = Math.floor(Math.random() * 54) + 15;
    operation = '+';
  } else {
    num1 = Math.floor(Math.random() * 54) + 25;
    num2 = Math.floor(Math.random() * (num1 - 11)) + 11;
    operation = '-';
  }

  const answer = operation === '+' ? num1 + num2 : num1 - num2;
  mathState.currentAnswer = answer;
  mathState.userInput = '';

  document.getElementById('op-num1').textContent = num1;
  document.getElementById('op-symbol').textContent = operation;
  document.getElementById('op-num2').textContent = num2;
  document.getElementById('op-answer').textContent = '?';
}

function mathUpdateHUD() {
  document.getElementById('math-score').textContent = mathState.score;
  document.getElementById('math-hearts').textContent = '❤️'.repeat(mathState.hearts) + '🖤'.repeat(3 - mathState.hearts);

  const levelNames = {
    1: '🌱 Sumas Fáciles',
    2: '⭐ Sumas Difíciles',
    3: '👑 Restas Geniales'
  };
  document.getElementById('math-level-badge').textContent = levelNames[mathState.level];
}

function mathStart() {
  mathState.score = 0;
  mathState.hearts = 3;
  mathState.level = 1;
  mathUpdateHUD();
  showView('#math-game', 'math-play-view');
  mathGenerateQuestion();
  document.getElementById('math-feedback').textContent = '';
  document.getElementById('math-feedback').className = 'feedback';
}

document.getElementById('btn-start-math').addEventListener('click', mathStart);
document.getElementById('btn-restart-math').addEventListener('click', mathStart);

document.querySelectorAll('.key[data-num]').forEach(key => {
  key.addEventListener('click', () => {
    if (mathState.userInput.length < 3) {
      mathState.userInput += key.dataset.num;
      document.getElementById('op-answer').textContent = mathState.userInput;
    }
  });
});

document.getElementById('math-clear').addEventListener('click', () => {
  mathState.userInput = '';
  document.getElementById('op-answer').textContent = '?';
});

document.getElementById('math-submit').addEventListener('click', () => {
  if (mathState.userInput === '') return;

  const userNum = parseInt(mathState.userInput, 10);
  const card = document.getElementById('math-anim-wrap');
  const feedback = document.getElementById('math-feedback');

  if (userNum === mathState.currentAnswer) {
    mathState.score++;
    card.classList.add('pulse-green');
    feedback.textContent = ['¡Súper bien! 🌟', '¡Eres increíble! 🎉', '¡Genial! 👏', '¡Fantástico! ✨'][Math.floor(Math.random() * 4)];
    feedback.className = 'feedback correct';

    if (mathState.score % 5 === 0 && mathState.level < 3) {
      mathState.level++;
      feedback.textContent = `¡Subiste al nivel ${mathState.level}! 🎯`;
    }
  } else {
    mathState.hearts--;
    card.classList.add('pulse-red');
    feedback.textContent = `¡Casi! La respuesta era ${mathState.currentAnswer} 💪`;
    feedback.className = 'feedback incorrect';
  }

  mathUpdateHUD();

  setTimeout(() => {
    card.classList.remove('pulse-green', 'pulse-red');
    feedback.textContent = '';
    feedback.className = 'feedback';

    if (mathState.hearts <= 0) {
      mathShowResult();
    } else {
      mathGenerateQuestion();
    }
  }, 1500);
});

function mathShowResult() {
  showView('#math-game', 'math-result-view');
  document.getElementById('math-final-score').textContent = mathState.score;

  let msg = '¡Sigue practicando! ¡Cada intento cuenta! 🌈';
  if (mathState.score >= 20) msg = '¡Eres un genio matemático! 🧠✨';
  else if (mathState.score >= 15) msg = '¡Excelente trabajo! 🌟';
  else if (mathState.score >= 10) msg = '¡Muy bien! 👏';
  else if (mathState.score >= 5) msg = '¡Buen comienzo! 😊';

  document.getElementById('math-final-msg').textContent = msg;
}

// =====================================================
// JUEGO DE LECTOESCRITURA
// =====================================================

const readingState = {
  storyDeck: [],       // mazo de IDs de historias pendientes por usar
  currentStory: null,
  currentQuestionIndex: 0,
  shuffledQuestions: [],   // preguntas con sus opciones ya mezcladas
  score: 0,
  hearts: 3,
  timer: 0,
  timerInterval: null,
  userStoryText: ''
};

// Crea (o recarga) el mazo de historias sin repetir hasta agotarlas
function refillDeckIfNeeded() {
  if (readingState.storyDeck.length === 0) {
    readingState.storyDeck = shuffleArray(STORIES.map(s => s.id));
  }
}

function drawNextStory() {
  refillDeckIfNeeded();
  const nextId = readingState.storyDeck.pop();
  return STORIES.find(s => s.id === nextId);
}

// Prepara las preguntas de una historia con las opciones (a, b, c) mezcladas aleatoriamente
function prepareShuffledQuestions(story) {
  return story.questions.map(q => {
    const shuffledOptions = shuffleArray(q.options);
    return {
      question: q.q,
      options: shuffledOptions,
      correctIndex: shuffledOptions.indexOf(q.correctText)
    };
  });
}

function readingUpdateHearts() {
  document.getElementById('reading-hearts').textContent = '❤️'.repeat(readingState.hearts) + '🖤'.repeat(3 - readingState.hearts);
}

function readingStart() {
  readingState.currentStory = drawNextStory();
  readingState.shuffledQuestions = prepareShuffledQuestions(readingState.currentStory);
  readingState.currentQuestionIndex = 0;
  readingState.score = 0;
  readingState.hearts = 3;
  readingState.timer = 0;
  readingState.userStoryText = '';

  document.getElementById('story-title').textContent = '📖 ' + readingState.currentStory.title;
  document.getElementById('story-text').textContent = readingState.currentStory.text;
  document.getElementById('user-story').value = '';
  document.getElementById('char-count').textContent = '0';

  readingUpdateHearts();
  showView('#reading-game', 'reading-story-view');

  clearInterval(readingState.timerInterval);
  readingState.timerInterval = setInterval(() => {
    readingState.timer++;
    const m = Math.floor(readingState.timer / 60);
    const s = (readingState.timer % 60).toString().padStart(2, '0');
    document.getElementById('reading-timer').textContent = `${m}:${s}`;
  }, 1000);
}

document.getElementById('btn-start-reading').addEventListener('click', readingStart);
document.getElementById('btn-restart-reading').addEventListener('click', readingStart);

document.getElementById('btn-finish-reading').addEventListener('click', () => {
  clearInterval(readingState.timerInterval);
  showView('#reading-game', 'reading-questions-view');
  readingShowQuestion();
});

function readingShowQuestion() {
  const total = readingState.shuffledQuestions.length;
  const idx = readingState.currentQuestionIndex;
  const q = readingState.shuffledQuestions[idx];

  document.getElementById('question-progress').textContent = `Pregunta ${idx + 1} de ${total}`;
  document.getElementById('question-text').textContent = q.question;
  readingUpdateHearts();

  const optionsContainer = document.getElementById('question-options');
  optionsContainer.innerHTML = '';
  const letters = ['a', 'b', 'c'];

  q.options.forEach((optionText, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="opt-letter">${letters[i]})</span>${optionText}`;
    btn.addEventListener('click', () => readingSelectAnswer(i, btn));
    optionsContainer.appendChild(btn);
  });

  document.getElementById('question-feedback').textContent = '';
  document.getElementById('question-feedback').className = 'feedback';
}

function readingSelectAnswer(selectedIndex, btnEl) {
  // Deshabilita todas las opciones tras responder, para evitar doble clic
  document.querySelectorAll('#question-options .option-btn').forEach(b => b.disabled = true);

  const q = readingState.shuffledQuestions[readingState.currentQuestionIndex];
  const isCorrect = selectedIndex === q.correctIndex;
  const feedback = document.getElementById('question-feedback');

  if (isCorrect) {
    readingState.score++;
    btnEl.classList.add('correct-answer');
    feedback.textContent = ['¡Excelente lectura! 📚', '¡Eres muy inteligente! 🌟', '¡Qué buena comprensión! 👏', '¡Genial! 🎉'][Math.floor(Math.random() * 4)];
    feedback.className = 'feedback correct';
  } else {
    readingState.hearts--;
    btnEl.classList.add('wrong-answer');
    feedback.textContent = '¡Casi! Vuelve a leer el cuento si necesitas ayuda 💪';
    feedback.className = 'feedback incorrect';
  }

  readingUpdateHearts();

  setTimeout(() => {
    if (readingState.currentQuestionIndex < readingState.shuffledQuestions.length - 1) {
      readingState.currentQuestionIndex++;
      readingShowQuestion();
    } else {
      readingGoToWriting();
    }
  }, 1800);
}

function readingGoToWriting() {
  document.getElementById('writing-prompt').textContent = readingState.currentStory.writingPrompt;

  let levelTitle = '📝 Aprendiz';
  if (readingState.score >= 3) levelTitle = '📚 Súper Lector';
  else if (readingState.score >= 2) levelTitle = '📖 Buen Lector';
  document.getElementById('reading-level-badge').textContent = levelTitle;

  showView('#reading-game', 'reading-writing-view');
}

document.getElementById('user-story').addEventListener('input', (e) => {
  readingState.userStoryText = e.target.value;
  document.getElementById('char-count').textContent = e.target.value.length;
});

document.getElementById('btn-submit-story').addEventListener('click', () => {
  const text = readingState.userStoryText.trim();
  const feedback = document.getElementById('writing-feedback');

  if (text.length > 10) {
    readingShowResult();
  } else {
    feedback.textContent = '¡Escribe un poquito más! Tu historia puede ser más larga 📝';
    feedback.className = 'feedback incorrect';
  }
});

function readingShowResult() {
  document.getElementById('reading-final-score').textContent = readingState.score;
  document.getElementById('reading-char-count').textContent = readingState.userStoryText.length;
  document.getElementById('final-story-text').textContent = readingState.userStoryText;

  let msg = '¡No te rindas! Cada lectura te hace más fuerte 🌟';
  if (readingState.score === 3) msg = '¡Eres un genio de la lectura! 🎓';
  else if (readingState.score === 2) msg = '¡Muy bien! Solo un poquito más de atención 📚';
  else if (readingState.score === 1) msg = '¡Buen trabajo! Sigue practicando 💪';
  document.getElementById('reading-final-msg').textContent = msg;

  showView('#reading-game', 'reading-result-view');
}