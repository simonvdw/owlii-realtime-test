// Reken Maar! - Calculation Game

// Cookie helper function
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function calculateAge(birthYear) {
  const currentYear = new Date().getFullYear();
  return currentYear - parseInt(birthYear);
}

// Game state
let currentQuestion = 0;
let score = 0;
let timeLeft = 60;
let timerInterval = null;
let questions = [];
let correctAnswer = 0;

// Get difficulty based on age
function getDifficulty(age) {
  if (age <= 6) return { max: 10, operations: ['+'] };
  if (age <= 8) return { max: 20, operations: ['+', '-'] };
  if (age <= 10) return { max: 50, operations: ['+', '-', '*'] };
  if (age <= 12) return { max: 100, operations: ['+', '-', '*'] };
  return { max: 200, operations: ['+', '-', '*'] };
}

// Generate a random number
function randomNumber(max) {
  return Math.floor(Math.random() * max) + 1;
}

// Generate a question
function generateQuestion(difficulty) {
  const operations = difficulty.operations;
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let num1 = randomNumber(difficulty.max);
  let num2 = randomNumber(difficulty.max);
  let answer;
  
  // Ensure subtraction doesn't result in negative numbers
  if (operation === '-' && num2 > num1) {
    [num1, num2] = [num2, num1];
  }
  
  // For multiplication, use smaller numbers
  if (operation === '*') {
    num1 = randomNumber(Math.min(12, difficulty.max / 5));
    num2 = randomNumber(Math.min(12, difficulty.max / 5));
  }
  
  switch (operation) {
    case '+':
      answer = num1 + num2;
      break;
    case '-':
      answer = num1 - num2;
      break;
    case '*':
      answer = num1 * num2;
      break;
  }
  
  return {
    equation: `${num1} ${operation} ${num2}`,
    answer: answer
  };
}

// Generate wrong answers
function generateWrongAnswers(correctAnswer, count = 2) {
  const wrongAnswers = new Set();
  
  while (wrongAnswers.size < count) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const wrongAnswer = correctAnswer + offset;
    
    if (wrongAnswer !== correctAnswer && wrongAnswer >= 0) {
      wrongAnswers.add(wrongAnswer);
    }
  }
  
  return Array.from(wrongAnswers);
}

// Shuffle array
function shuffle(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Initialize game
function initGame() {
  const savedName = getCookie('owlyUserName');
  const savedBirthYear = getCookie('owlyUserBirthYear');
  
  const ageWarning = document.getElementById('ageWarning');
  const ageDisplay = document.getElementById('ageDisplay');
  const startButton = document.getElementById('startButton');
  
  if (!savedName || !savedBirthYear) {
    ageWarning.style.display = 'block';
    startButton.disabled = true;
    startButton.style.opacity = '0.5';
    startButton.style.cursor = 'not-allowed';
    return;
  }
  
  const age = calculateAge(savedBirthYear);
  document.getElementById('playerName').textContent = savedName;
  document.getElementById('playerAge').textContent = age;
  ageDisplay.style.display = 'block';
  
  // Store age for game
  window.gameAge = age;
}

// Start game
function startGame() {
  currentQuestion = 0;
  score = 0;
  timeLeft = 60;
  
  const difficulty = getDifficulty(window.gameAge);
  questions = [];
  
  // Generate 10 questions
  for (let i = 0; i < 10; i++) {
    questions.push(generateQuestion(difficulty));
  }
  
  // Switch to game screen
  document.getElementById('gameStart').classList.remove('active');
  document.getElementById('gamePlay').classList.add('active');
  
  // Start timer
  startTimer();
  
  // Show first question
  showQuestion();
}

// Start timer
function startTimer() {
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

// Update timer display
function updateTimerDisplay() {
  document.getElementById('timeLeft').textContent = timeLeft;
}

// Show question
function showQuestion() {
  if (currentQuestion >= questions.length) {
    endGame();
    return;
  }

  const question = questions[currentQuestion];
  correctAnswer = question.answer;

  // Update question number and equation
  document.getElementById('questionNumber').textContent = currentQuestion + 1;
  document.getElementById('equation').textContent = `${question.equation} = ?`;

  // Generate answer options
  const wrongAnswers = generateWrongAnswers(correctAnswer);
  const allAnswers = shuffle([correctAnswer, ...wrongAnswers]);

  // Update answer buttons
  const answerButtons = document.querySelectorAll('.answer-button');
  answerButtons.forEach((button, index) => {
    button.textContent = allAnswers[index];
    button.dataset.answer = allAnswers[index];
    button.disabled = false;
    button.classList.remove('correct', 'wrong');
  });
}

// Check answer
function checkAnswer(selectedAnswer) {
  const answerButtons = document.querySelectorAll('.answer-button');

  // Disable all buttons
  answerButtons.forEach(button => {
    button.disabled = true;

    // Highlight correct and wrong answers
    if (parseInt(button.dataset.answer) === correctAnswer) {
      button.classList.add('correct');
    } else if (parseInt(button.dataset.answer) === selectedAnswer) {
      button.classList.add('wrong');
    }
  });

  // Update score if correct
  if (selectedAnswer === correctAnswer) {
    score++;
    document.getElementById('currentScore').textContent = score;
  }

  // Move to next question after a delay
  setTimeout(() => {
    currentQuestion++;
    showQuestion();
  }, 1000);
}

// End game
function endGame() {
  clearInterval(timerInterval);

  // Switch to end screen
  document.getElementById('gamePlay').classList.remove('active');
  document.getElementById('gameEnd').classList.add('active');

  // Display results
  document.getElementById('finalScore').textContent = score;

  // Set result message based on score
  const resultTitle = document.getElementById('resultTitle');
  const resultMessage = document.getElementById('resultMessage');

  if (score === 10) {
    resultTitle.textContent = '🏆 PERFECT! 🏆';
    resultMessage.textContent = 'Je bent een echte rekenmeester!';
  } else if (score >= 8) {
    resultTitle.textContent = '🌟 Geweldig! 🌟';
    resultMessage.textContent = 'Bijna perfect! Goed gedaan!';
  } else if (score >= 6) {
    resultTitle.textContent = '👍 Goed gedaan! 👍';
    resultMessage.textContent = 'Je bent goed bezig!';
  } else if (score >= 4) {
    resultTitle.textContent = '💪 Niet slecht! 💪';
    resultMessage.textContent = 'Blijf oefenen, je wordt steeds beter!';
  } else {
    resultTitle.textContent = '🦉 Blijf proberen! 🦉';
    resultMessage.textContent = 'Oefening baart kunst!';
  }
}

// Reset game
function resetGame() {
  document.getElementById('gameEnd').classList.remove('active');
  document.getElementById('gameStart').classList.add('active');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  initGame();

  document.getElementById('startButton').addEventListener('click', startGame);
  document.getElementById('playAgainButton').addEventListener('click', resetGame);

  // Answer button click handlers
  document.querySelectorAll('.answer-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const selectedAnswer = parseInt(e.target.dataset.answer);
      checkAnswer(selectedAnswer);
    });
  });
});

