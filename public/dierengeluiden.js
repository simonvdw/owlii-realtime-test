// Dierengeluiden - Animal Sounds Game
(function() {
  'use strict';

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

  // Game state
  let currentRound = 0;
  let score = 0;
  let timeLeft = 60;
  let timerInterval = null;
  let currentAudio = null;
  let correctAnimal = '';

  // Animal data with sounds
  const animals = [
    { name: 'eend', emoji: '🦆', sound: 'dierengeluid-eend.mp3' },
    { name: 'geit', emoji: '🐐', sound: 'dierengeluid-geit.mp3' },
    { name: 'kip', emoji: '🐔', sound: 'dierengeluid-kip.mp3' },
    { name: 'paard', emoji: '🐴', sound: 'dierengeluid-paard.mp3' }
  ];

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
  function initAnimalGame() {
    const savedName = getCookie('owlyUserName');
    const savedBirthYear = getCookie('owlyUserBirthYear');

    const ageWarning = document.getElementById('animalAgeWarning');
    const ageDisplay = document.getElementById('animalAgeDisplay');
    const startButton = document.getElementById('animalStartButton');

    if (!savedName || !savedBirthYear) {
      ageWarning.style.display = 'block';
      startButton.disabled = true;
      startButton.style.opacity = '0.5';
      startButton.style.cursor = 'not-allowed';
      return;
    }

    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(savedBirthYear);
    document.getElementById('animalPlayerName').textContent = savedName;
    document.getElementById('animalPlayerAge').textContent = age;
    ageDisplay.style.display = 'block';
  }

  // Start game
  function startAnimalGame() {
    currentRound = 0;
    score = 0;
    timeLeft = 60;

    // Switch to game screen
    document.getElementById('animalGameStart').classList.remove('active');
    document.getElementById('animalGamePlay').classList.add('active');

    // Start timer
    startAnimalTimer();

    // Show first round
    showAnimalRound();
  }

  // Start timer
  function startAnimalTimer() {
    updateAnimalTimerDisplay();

    timerInterval = setInterval(() => {
      timeLeft--;
      updateAnimalTimerDisplay();

      if (timeLeft <= 0) {
        endAnimalGame();
      }
    }, 1000);
  }

  // Update timer display
  function updateAnimalTimerDisplay() {
    document.getElementById('animalTimeLeft').textContent = timeLeft;
  }

  // Show round
  function showAnimalRound() {
    if (currentRound >= 10) {
      endAnimalGame();
      return;
    }

    // Stop any playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    // Select random animal
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    correctAnimal = randomAnimal.name;

    // Update round number
    document.getElementById('animalRoundNumber').textContent = currentRound + 1;

    // Create and play audio
    currentAudio = new Audio(randomAnimal.sound);
    currentAudio.play();

    // Get two wrong animals
    const wrongAnimals = animals.filter(a => a.name !== correctAnimal);
    const shuffledWrong = shuffle(wrongAnimals).slice(0, 2);

    // Combine and shuffle all options
    const allOptions = shuffle([randomAnimal, ...shuffledWrong]);

    // Update answer buttons
    const answerButtons = document.querySelectorAll('.animal-answer-button');
    answerButtons.forEach((button, index) => {
      const animal = allOptions[index];
      button.innerHTML = `${animal.emoji}<br>${animal.name}`;
      button.dataset.animal = animal.name;
      button.disabled = false;
      button.classList.remove('correct', 'wrong');
    });
  }

  // Replay sound
  function replayAnimalSound() {
    if (currentAudio) {
      currentAudio.currentTime = 0;
      currentAudio.play();
    }
  }

  // Check answer
  function checkAnimalAnswer(selectedAnimal) {
    const answerButtons = document.querySelectorAll('.animal-answer-button');

    // Disable all buttons
    answerButtons.forEach(button => {
      button.disabled = true;

      // Highlight correct and wrong answers
      if (button.dataset.animal === correctAnimal) {
        button.classList.add('correct');
      } else if (button.dataset.animal === selectedAnimal) {
        button.classList.add('wrong');
      }
    });

    // Update score if correct
    if (selectedAnimal === correctAnimal) {
      score++;
      document.getElementById('animalCurrentScore').textContent = score;
    }

    // Stop audio
    if (currentAudio) {
      currentAudio.pause();
    }

    // Move to next round after a delay
    setTimeout(() => {
      currentRound++;
      showAnimalRound();
    }, 1500);
  }

  // End game
  function endAnimalGame() {
    clearInterval(timerInterval);

    // Stop any playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    // Switch to end screen
    document.getElementById('animalGamePlay').classList.remove('active');
    document.getElementById('animalGameEnd').classList.add('active');

    // Display results
    document.getElementById('animalFinalScore').textContent = score;

    // Set result message based on score
    const resultTitle = document.getElementById('animalResultTitle');
    const resultMessage = document.getElementById('animalResultMessage');

    if (score === 10) {
      resultTitle.textContent = '🏆 PERFECT! 🏆';
      resultMessage.textContent = 'Je kent alle dierengeluiden!';
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
  function resetAnimalGame() {
    document.getElementById('animalGameEnd').classList.remove('active');
    document.getElementById('animalGameStart').classList.add('active');
  }

  // Event listeners
  document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if the animal game elements exist
    if (document.getElementById('animalStartButton')) {
      initAnimalGame();

      document.getElementById('animalStartButton').addEventListener('click', startAnimalGame);
      document.getElementById('animalPlayAgainButton').addEventListener('click', resetAnimalGame);
      document.getElementById('animalReplayButton').addEventListener('click', replayAnimalSound);

      // Answer button click handlers
      document.querySelectorAll('.animal-answer-button').forEach(button => {
        button.addEventListener('click', (e) => {
          const selectedAnimal = e.currentTarget.dataset.animal;
          checkAnimalAnswer(selectedAnimal);
        });
      });
    }
  });

})(); // End of IIFE

