// main.js の修正案

const quizData = [];
for (let i = 1; i <= 20; i++) {
  quizData.push({ question: `${i}^2`, answer: (i * i).toString() });
}

// 💡 提案：必要に応じて問題をシャッフルする場合（コメントアウト解除で有効化）
// quizData.sort(() => Math.random() - 0.5);

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzaEbohb33NPS8iYg8YmCB46xcd99OwvjuV28EUXt9elnQ7DTzaFJkcmF8r0ez_BIXEZQ/exec';

let currentQuestionIndex = 0;
let answers = Array(quizData.length).fill("");
let timerInterval;
let remainingTime = 60 * 3; // 3分

document.getElementById('user-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const grade = document.getElementById('grade').value.trim();
  const className = document.getElementById('class').value;
  const number = document.getElementById('number').value;

  if (!name || !grade || !className || !number) {
    alert("すべての項目を入力してください。");
    return;
  }

  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('quiz-screen').style.display = 'block';
  document.addEventListener("visibilitychange", handleVisibilityChange);
  startTimer();
  showQuestion();
});

function showQuestion() {
  const q = quizData[currentQuestionIndex];
  
  // 問題文の表示（[問題数/全問題数] を出すと親切）
  document.getElementById('question-text').innerHTML = `(${currentQuestionIndex + 1}/${quizData.length}) \\(${q.question.replace("^2", "^{2}")}\\) =`;
  document.getElementById('answer-input').value = answers[currentQuestionIndex] || '';
  
  // ボタンの制御
  document.getElementById('back-button').style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
  
  const nextBtn = document.getElementById('next-button');
  if (currentQuestionIndex === quizData.length - 1) {
    nextBtn.textContent = "送信する";
    nextBtn.style.backgroundColor = "#d32f2f"; // 送信ボタンは色を変えて目立たせる
  } else {
    nextBtn.textContent = "次へ";
    nextBtn.style.backgroundColor = "#4CAF50";
  }

  if (window.MathJax) MathJax.typesetPromise();
}

document.getElementById('next-button').addEventListener('click', () => {
  // 現在の入力を保存（空欄でも許可）
  const input = document.getElementById('answer-input').value.trim();
  answers[currentQuestionIndex] = input;

  if (currentQuestionIndex === quizData.length - 1) {
    // 最終問題なら送信確認
    confirmSubmit();
  } else {
    currentQuestionIndex++;
    showQuestion();
  }
});

document.getElementById('back-button').addEventListener('click', () => {
  const input = document.getElementById('answer-input').value.trim();
  answers[currentQuestionIndex] = input;
  currentQuestionIndex--;
  showQuestion();
});

// キーボードのEnter対応
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('next-button').click();
  }
});

function insertSymbol(sym) {
  const input = document.getElementById('answer-input');
  input.value += sym;
}

function backspace() {
  const input = document.getElementById('answer-input');
  input.value = input.value.slice(0, -1);
}

function clearInput() {
  document.getElementById('answer-input').value = '';
}

// 💡 厳しすぎる即送信を「警告」に変更
function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    alert("【警告】テスト画面から離れないでください。最初からやり直しになる、または不正とみなされる場合があります。");
  }
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    remainingTime--;
    updateTimerDisplay();
    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      alert("制限時間になりました。自動的に解答を送信します。");
      submitAnswers();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const min = Math.floor(remainingTime / 60);
  const sec = remainingTime % 60;
  document.getElementById('timer').textContent = `残り時間: ${min}:${sec.toString().padStart(2, '0')}`;
}

function confirmSubmit() {
  // 未入力の問題がないかチェックしてあげる優しさ
  const unansweredCount = answers.filter(a => a === "").length;
  let msg = "解答を送信しますか？";
  if (unansweredCount > 0) {
    msg = `未入力の問題が ${unansweredCount} 問あります。\n本当に送信しますか？`;
  }

  if (confirm(msg)) {
    submitAnswers();
  }
}

async function submitAnswers() {
  clearInterval(timerInterval);
  document.getElementById('next-button').disabled = true;
  document.getElementById('back-button').disabled = true;

  // ※本当は最後の入力値も反映させるべき（上記clickイベントで反映済み）

  const name = encodeURIComponent(document.getElementById('name').value);
  const grade = encodeURIComponent(document.getElementById('grade').value);
  const className = encodeURIComponent(document.getElementById('class').value);
  const number = encodeURIComponent(document.getElementById('number').value);
  const answersStr = encodeURIComponent(answers.join(','));

  const score = quizData.reduce((acc, q, i) =>
    acc + (answers[i] === q.answer ? 1 : 0), 0);

  const incorrect = quizData
    .map((q, i) =>
      answers[i] !== q.answer
        ? `${q.question}=${answers[i] || "未入力"}（正:${q.answer}）`
        : null
    )
    .filter(Boolean)
    .join('; ');
  const reason = encodeURIComponent(incorrect);

  const url = `${GAS_URL}?name=${name}&grade=${grade}&className=${className}&number=${number}&answers=${answersStr}&score=${score}&reason=${reason}`;

  let success = false;
  for (let i = 0; i < 3; i++) {
    try {
      await fetch(url, { method: 'GET', mode: 'no-cors' });
      success = true;
      break;
    } catch (err) {
      console.warn(`送信リトライ ${i + 1} 回目失敗`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (!success) {
    alert("送信に失敗しました。通信環境を確認してください。");
    return;
  }

  alert(`${quizData.length}問中${score}問正解でした。\n\n【間違い】\n${incorrect || "なし"}`);
  location.reload();
}
