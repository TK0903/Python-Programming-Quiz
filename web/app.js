"use strict";

const ROUND_SIZE = 10;
const LETTERS = ["A", "B", "C", "D"];
const byId = (id) => document.getElementById(id);

const homeScreen = byId("home-screen");
const quizScreen = byId("quiz-screen");
const resultsScreen = byId("results-screen");
const startButton = byId("start-button");
const retryButton = byId("retry-button");
const loadMessage = byId("load-message");
const questionText = byId("question-text");
const choiceForm = byId("choice-form");
const choices = byId("choices");
const submitButton = byId("submit-button");
const nextButton = byId("next-button");
const nextButtonLabel = byId("next-button-label");
const feedback = byId("feedback");
const feedbackTitle = byId("feedback-title");
const feedbackAnswer = byId("feedback-answer");
const feedbackText = byId("feedback-text");
const progressBar = byId("progress-bar");
const reviewList = byId("review-list");

let questionBank = [];
let round = [];
let questionIndex = 0;
let responses = [];

function isQuestion(entry) {
  return entry !== null && typeof entry === "object"
    && typeof entry.question === "string"
    && typeof entry.explanation === "string"
    && Array.isArray(entry.choices)
    && entry.choices.length === LETTERS.length
    && entry.choices.every((choice) => typeof choice === "string")
    && LETTERS.includes(entry.answer);
}

async function readQuestionData() {
  const embedded = byId("offline-questions");
  if (embedded) {
    return JSON.parse(embedded.textContent);
  }

  const response = await fetch("./data/questions.json");
  if (!response.ok) {
    throw new Error(`Question data request returned ${response.status}`);
  }
  return response.json();
}

async function loadQuestions(focusOnCompletion = false) {
  startButton.disabled = true;
  retryButton.disabled = true;
  loadMessage.hidden = false;
  loadMessage.textContent = "問題を読み込んでいます…";

  try {
    const entries = await readQuestionData();
    if (!Array.isArray(entries) || entries.length === 0 || !entries.every(isQuestion)) {
      throw new Error("Question data has an invalid format");
    }

    questionBank = entries;
    byId("bank-count").textContent = entries.length;
    byId("quiz-total").textContent = Math.min(ROUND_SIZE, entries.length);
    retryButton.hidden = true;
    loadMessage.hidden = true;
    startButton.disabled = false;
    if (focusOnCompletion) {
      startButton.focus();
    }
  } catch (error) {
    console.error("Could not load quiz questions", error);
    loadMessage.textContent = "問題を読み込めませんでした。再試行してください。";
    retryButton.hidden = false;
    retryButton.disabled = false;
    if (focusOnCompletion) {
      retryButton.focus();
    }
  }
}

function showScreen(screen) {
  for (const panel of [homeScreen, quizScreen, resultsScreen]) {
    panel.hidden = panel !== screen;
  }
}

function createTextElement(tag, className, content) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = content;
  return element;
}

function splitQuestion(question) {
  const separator = /\r?\n\r?\n/.exec(question);
  if (!separator) {
    return { prompt: question, code: "" };
  }

  return {
    prompt: question.slice(0, separator.index),
    code: question.slice(separator.index + separator[0].length),
  };
}

function createCodeBlock(code) {
  const block = document.createElement("pre");
  block.className = "code-block";
  block.append(createTextElement("code", "code-text", code));
  return block;
}

function createChoice(value, index) {
  const letter = LETTERS[index];
  const option = document.createElement("label");
  option.className = "choice";

  const radio = document.createElement("input");
  radio.className = "choice-input";
  radio.type = "radio";
  radio.name = "choice";
  radio.value = letter;

  const key = createTextElement("span", "choice-key", letter);
  const text = createTextElement("span", "choice-text", value);
  option.append(radio, key, text);
  return option;
}

function updateProgress() {
  progressBar.max = round.length;
  progressBar.value = responses.length;
  byId("progress-label").textContent = `${responses.length} / ${round.length} 問`;
  byId("correct-count").textContent = responses.filter((response) => response.correct).length;
}

function renderQuestion() {
  const entry = round[questionIndex];
  const number = questionIndex + 1;
  byId("question-count").textContent = `問題 ${String(number).padStart(2, "0")} / ${round.length}`;
  byId("question-heading").textContent = `第${number}問`;
  const { prompt, code } = splitQuestion(entry.question);
  questionText.replaceChildren(createTextElement("p", "question-prompt", prompt));
  if (code) {
    questionText.append(createCodeBlock(code));
  }
  choices.replaceChildren(...entry.choices.map(createChoice));
  submitButton.disabled = true;
  submitButton.hidden = false;
  nextButton.hidden = true;
  feedback.hidden = true;
  updateProgress();
  byId("question-heading").focus();
}

function startRound() {
  if (questionBank.length === 0) {
    return;
  }

  const pool = [...questionBank];
  const count = Math.min(ROUND_SIZE, pool.length);
  for (let index = 0; index < count; index += 1) {
    const picked = index + Math.floor(Math.random() * (pool.length - index));
    [pool[index], pool[picked]] = [pool[picked], pool[index]];
  }
  round = pool.slice(0, count);
  questionIndex = 0;
  responses = [];
  showScreen(quizScreen);
  renderQuestion();
}

function correctAnswerText(entry) {
  const answer = entry.answer;
  return `正解（${answer}） ${entry.choices[LETTERS.indexOf(answer)]}`;
}

function gradeAnswer(event) {
  event.preventDefault();
  const selected = choices.querySelector('input[name="choice"]:checked');
  if (!selected || responses.length !== questionIndex || quizScreen.hidden) {
    return;
  }

  const entry = round[questionIndex];
  const correct = selected.value === entry.answer;
  responses.push({ selected: selected.value, correct });

  for (const radio of choices.querySelectorAll("input")) {
    radio.disabled = true;
    const option = radio.closest(".choice");
    if (radio.value === entry.answer) {
      option.dataset.result = "correct";
      option.append(createTextElement("span", "choice-marker", "正解"));
    } else if (radio === selected) {
      option.dataset.result = "incorrect";
      option.append(createTextElement("span", "choice-marker", "不正解"));
    }
  }

  feedback.dataset.result = correct ? "correct" : "incorrect";
  feedbackTitle.textContent = correct ? "正解です" : "不正解です";
  feedbackAnswer.textContent = correctAnswerText(entry);
  feedbackText.textContent = entry.explanation;
  feedback.hidden = false;
  submitButton.hidden = true;
  nextButtonLabel.textContent = questionIndex + 1 === round.length ? "結果を見る" : "次の問題";
  nextButton.hidden = false;
  updateProgress();
  feedbackTitle.focus();
}

function createReview(entry, index, selected) {
  const review = document.createElement("details");
  review.className = "review-item";
  const { prompt, code } = splitQuestion(entry.question);
  const summary = createTextElement("summary", "review-summary", `第${index + 1}問　${prompt}`);
  const content = document.createElement("div");
  content.className = "review-content";
  const answer = `あなたの回答（${selected}） ${entry.choices[LETTERS.indexOf(selected)]}`;

  if (code) {
    content.append(createCodeBlock(code));
  }
  content.append(
    createTextElement("p", "review-answer review-answer--incorrect", answer),
    createTextElement("p", "review-answer review-answer--correct", correctAnswerText(entry)),
    createTextElement("p", "review-explanation", entry.explanation),
  );
  review.append(summary, content);
  return review;
}

function showResults() {
  reviewList.replaceChildren();
  let correctCount = 0;
  for (const [index, response] of responses.entries()) {
    if (response.correct) {
      correctCount += 1;
    } else {
      reviewList.append(createReview(round[index], index, response.selected));
    }
  }

  const allCorrect = correctCount === round.length;
  byId("result-score").textContent = `${correctCount} / ${round.length}`;
  byId("result-message").textContent = allCorrect
    ? "全問正解です。"
    : "間違えた問題を下で見直せます。";
  byId("result-review").hidden = allCorrect;
  showScreen(resultsScreen);
  byId("result-title").focus();
}

function advance() {
  if (quizScreen.hidden || responses.length !== questionIndex + 1) {
    return;
  }
  if (responses.length === round.length) {
    showResults();
    return;
  }

  questionIndex += 1;
  renderQuestion();
}

function goHome() {
  showScreen(homeScreen);
  byId("home-title").focus();
}

choiceForm.addEventListener("change", () => {
  submitButton.disabled = !choices.querySelector('input[name="choice"]:checked');
});
choiceForm.addEventListener("submit", gradeAnswer);
startButton.addEventListener("click", startRound);
retryButton.addEventListener("click", () => loadQuestions(true));
nextButton.addEventListener("click", advance);
byId("restart-button").addEventListener("click", startRound);
byId("home-button").addEventListener("click", goHome);
byId("quit-button").addEventListener("click", () => {
  const hasProgress = responses.length > 0 || choices.querySelector('input[name="choice"]:checked');
  if (!hasProgress || window.confirm("今回のクイズを中断して、ホームに戻りますか？")) {
    goHome();
  }
});

loadQuestions();
