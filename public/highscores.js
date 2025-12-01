// High Scores Manager - Shared across all games

const HighScores = (function() {
  'use strict';

  const STORAGE_KEY = 'owlyHighScores';
  const MAX_SCORES = 10;

  // Get all high scores from localStorage
  function getAllScores() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading high scores:', e);
      return [];
    }
  }

  // Save high scores to localStorage
  function saveScores(scores) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch (e) {
      console.error('Error saving high scores:', e);
    }
  }

  // Format date as dd/mm/yy
  function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  // Add a new score
  function addScore(gameName, playerName, score, timeUsed) {
    const scores = getAllScores();

    const newScore = {
      game: gameName,
      player: playerName,
      score: score,
      timeUsed: timeUsed,
      timestamp: new Date().toISOString(),
      date: formatDate(new Date())
    };

    scores.push(newScore);

    // Sort by score (descending), then by time used (ascending)
    scores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.timeUsed - b.timeUsed;
    });

    // Keep only top MAX_SCORES
    const trimmedScores = scores.slice(0, MAX_SCORES);
    saveScores(trimmedScores);

    return trimmedScores;
  }

  // Get scores for a specific game
  function getScoresByGame(gameName) {
    const allScores = getAllScores();
    return allScores.filter(score => score.game === gameName);
  }

  // Format time in seconds to MM:SS
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Render high scores table
  function renderHighScoresTable() {
    const container = document.getElementById('highScoresContainer');
    if (!container) return;

    const scores = getAllScores();

    if (scores.length === 0) {
      container.innerHTML = `
        <div class="no-scores">
          <p>Nog geen high scores! Speel een spel om de eerste te zijn! 🎮</p>
        </div>
      `;
      return;
    }

    let html = `
      <h2>🏆 Top Scores</h2>
      <div class="highscores-table-wrapper">
        <table class="highscores-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Spel</th>
              <th>Naam</th>
              <th>Score</th>
              <th>Tijd</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>
    `;

    scores.forEach((score, index) => {
      const gameEmoji = score.game === 'Reken Maar' ? '🧮' : '🐾';
      // Fallback: if date is missing, generate it from timestamp
      const displayDate = score.date || (score.timestamp ? formatDate(score.timestamp) : '-');
      html += `
        <tr>
          <td class="rank">${index + 1}</td>
          <td class="game">${gameEmoji} ${score.game}</td>
          <td class="player">${score.player}</td>
          <td class="score">${score.score}/10</td>
          <td class="time">${formatTime(score.timeUsed)}</td>
          <td class="date">${displayDate}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  }

  // Public API
  return {
    addScore: addScore,
    getAllScores: getAllScores,
    getScoresByGame: getScoresByGame,
    renderHighScoresTable: renderHighScoresTable,
    formatTime: formatTime
  };

})();

// Render high scores when page loads
document.addEventListener('DOMContentLoaded', () => {
  HighScores.renderHighScoresTable();
});

