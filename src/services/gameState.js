// src/services/gameState.js
// In-memory game state management

// Active games per chat
const activeGames = new Map();

// Trivia questions database
const triviaQuestions = [
  { question: "Apa ibukota Indonesia?", answer: "jakarta", category: "Geografi" },
  { question: "Siapa presiden pertama Indonesia?", answer: "soekarno", category: "Sejarah" },
  { question: "Berapa hasil dari 15 x 8?", answer: "120", category: "Matematika" },
  { question: "Planet apa yang paling dekat dengan Matahari?", answer: "merkurius", category: "Sains" },
  { question: "Apa nama mata uang Jepang?", answer: "yen", category: "Umum" },
  { question: "Siapa penemu bola lampu?", answer: "edison", category: "Sejarah" },
  { question: "Apa nama gunung tertinggi di dunia?", answer: "everest", category: "Geografi" },
  { question: "Berapa jumlah provinsi di Indonesia?", answer: "38", category: "Geografi" },
  { question: "Apa rumus kimia air?", answer: "h2o", category: "Sains" },
  { question: "Tahun berapa Indonesia merdeka?", answer: "1945", category: "Sejarah" },
  { question: "Apa nama hewan terbesar di dunia?", answer: "paus biru", category: "Sains" },
  { question: "Siapa penulis novel Laskar Pelangi?", answer: "andrea hirata", category: "Sastra" },
  { question: "Apa nama ibu kota Australia?", answer: "canberra", category: "Geografi" },
  { question: "Berapa hasil dari 144 / 12?", answer: "12", category: "Matematika" },
  { question: "Apa nama planet terbesar di tata surya?", answer: "jupiter", category: "Sains" },
  { question: "Siapa pelukis Mona Lisa?", answer: "leonardo da vinci", category: "Seni" },
  { question: "Apa nama danau terbesar di Indonesia?", answer: "toba", category: "Geografi" },
  { question: "Berapa jumlah pemain dalam tim sepak bola?", answer: "11", category: "Olahraga" },
  { question: "Apa nama samaran Bung Karno?", answer: "kusno", category: "Sejarah" },
  { question: "Apa kepanjangan dari HTML?", answer: "hypertext markup language", category: "Teknologi" }
];

/**
 * Start a number guessing game
 */
function startTebakAngka(chatId) {
  const targetNumber = Math.floor(Math.random() * 100) + 1;
  activeGames.set(`tebak_${chatId}`, {
    type: 'tebak',
    target: targetNumber,
    attempts: 0,
    maxAttempts: 7,
    startTime: Date.now(),
    participants: new Map()
  });
  return { maxAttempts: 7 };
}

/**
 * Make a guess in the number game
 */
function guessTebakAngka(chatId, playerId, playerName, guess) {
  const game = activeGames.get(`tebak_${chatId}`);
  if (!game || game.type !== 'tebak') {
    return { error: 'Tidak ada game tebak angka yang aktif!' };
  }

  game.attempts++;
  
  // Track participant
  if (!game.participants.has(playerId)) {
    game.participants.set(playerId, { name: playerName, guesses: 0 });
  }
  game.participants.get(playerId).guesses++;

  if (guess === game.target) {
    const result = {
      won: true,
      number: game.target,
      attempts: game.attempts,
      winner: playerName,
      winnerId: playerId
    };
    activeGames.delete(`tebak_${chatId}`);
    return result;
  }

  if (game.attempts >= game.maxAttempts) {
    const result = {
      lost: true,
      number: game.target,
      attempts: game.attempts
    };
    activeGames.delete(`tebak_${chatId}`);
    return result;
  }

  return {
    hint: guess < game.target ? 'lebih besar' : 'lebih kecil',
    attemptsLeft: game.maxAttempts - game.attempts
  };
}

/**
 * Start a trivia game
 */
function startTrivia(chatId) {
  const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
  activeGames.set(`trivia_${chatId}`, {
    type: 'trivia',
    question: question.question,
    answer: question.answer.toLowerCase(),
    category: question.category,
    startTime: Date.now(),
    timeout: 60000, // 60 seconds
    answered: false
  });
  return question;
}

/**
 * Answer a trivia question
 */
function answerTrivia(chatId, playerId, playerName, answer) {
  const game = activeGames.get(`trivia_${chatId}`);
  if (!game || game.type !== 'trivia') {
    return { error: 'Tidak ada trivia yang aktif!' };
  }

  // Check timeout
  if (Date.now() - game.startTime > game.timeout) {
    const correctAnswer = game.answer;
    activeGames.delete(`trivia_${chatId}`);
    return { timeout: true, correctAnswer };
  }

  // Check answer (case insensitive, trim)
  const normalizedAnswer = answer.toLowerCase().trim();
  const correctAnswer = game.answer;
  
  // Allow partial match for longer answers
  const isCorrect = normalizedAnswer === correctAnswer || 
    correctAnswer.includes(normalizedAnswer) ||
    normalizedAnswer.includes(correctAnswer);

  if (isCorrect) {
    activeGames.delete(`trivia_${chatId}`);
    return {
      correct: true,
      winner: playerName,
      winnerId: playerId,
      answer: correctAnswer,
      timeMs: Date.now() - game.startTime
    };
  }

  return { correct: false };
}

/**
 * Get active trivia for a chat
 */
function getActiveTrivia(chatId) {
  return activeGames.get(`trivia_${chatId}`);
}

/**
 * End trivia game
 */
function endTrivia(chatId) {
  const game = activeGames.get(`trivia_${chatId}`);
  if (game) {
    const answer = game.answer;
    activeGames.delete(`trivia_${chatId}`);
    return { answer };
  }
  return null;
}

/**
 * Spin/random picker from list
 */
function spin(items) {
  if (!items || items.length === 0) return null;
  const index = Math.floor(Math.random() * items.length);
  return {
    selected: items[index],
    index: index,
    total: items.length
  };
}

/**
 * Check if a game is active
 */
function isGameActive(chatId, gameType) {
  return activeGames.has(`${gameType}_${chatId}`);
}

/**
 * Get game info
 */
function getGameInfo(chatId, gameType) {
  return activeGames.get(`${gameType}_${chatId}`);
}

module.exports = {
  startTebakAngka,
  guessTebakAngka,
  startTrivia,
  answerTrivia,
  getActiveTrivia,
  endTrivia,
  spin,
  isGameActive,
  getGameInfo
};
