import React, { useEffect, useRef } from 'react';

const SpellerGUI = ({
  syllableCount,
  timeLeft,
  score,
  correctWords,
  loading,
  userInput,
  wordSpelledCorrectly,
  definition,
  partOfSpeech,
  usage,
  previousScore,
  previousCorrectWords,
  previousWord,
  error,
  handleSyllableCountChange,
  handleGiveUp,
  handleHint,
  handleSkip,
  handlePronunciation,
  handleUserInputChange,
  speakWord,
  speakDefinition,
  speakUsage,
  hintCost,
  gameOver,
  inputRef,
  word,
  correctWordsList
}) => {
  const correctWordsListRef = useRef(null);

  useEffect(() => {
    if (correctWordsListRef.current) {
      correctWordsListRef.current.scrollTop = correctWordsListRef.current.scrollHeight;
    }
  }, [correctWordsList]);

  return (
    <div>
      <h1>Spell the Words</h1>
      <div>
        <p>Choose Level:</p>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((level) => (
          <button
            key={level}
            onClick={() => handleSyllableCountChange(level)}
            disabled={loading}
          >
            Level {level}
          </button>
        ))}
      </div>

      <div>
        <p>Current Level: {syllableCount}</p>
        <p>Time Left: {timeLeft}s</p>
        <p className="score">Score: {score}</p>
        <p className="correct-words">Correct Words: {correctWords}</p>
      </div>

      <button onClick={handleGiveUp} disabled={loading}>
        Give Up
      </button>

      <button onClick={handleHint} disabled={score < hintCost || loading}>
        Hint ({hintCost} points)
      </button>

      <button onClick={handleSkip} disabled={score < Math.round(hintCost / 2) || loading}>
        Skip ({Math.round(hintCost / 2)} points)
      </button>

      <button onClick={handlePronunciation} disabled={loading}>
        Pronunciation
      </button>

      <div>
        <input
          type="text"
          value={userInput}
          onChange={handleUserInputChange}
          placeholder="Spell the word"
          disabled={gameOver || loading}
          ref={inputRef}
        />
        {wordSpelledCorrectly && <p style={{ color: 'green' }}>Correct! Loading new word...</p>}
      </div>

      <div>
        <h3>Definition:</h3>
        <p>{definition}</p>
        <h3>Part of Speech:</h3>
        <p>{partOfSpeech}</p>
        <h3>Usage:</h3>
        <p>{usage}</p>
      </div>

      <button onClick={() => speakWord(word)} disabled={loading}>Repeat Word</button>
      <button onClick={() => speakDefinition(definition)} disabled={loading}>Repeat Definition</button>
      <button onClick={() => speakUsage(usage)} disabled={loading}>Repeat Usage</button>

      {gameOver && (
        <div>
          <p>Thank you for playing! Your score is {previousScore}. You got {previousCorrectWords} words right.</p>
          <p>
            <a href={`https://www.merriam-webster.com/dictionary/${previousWord}`} target="_blank" rel="noopener noreferrer">
              View the word on Merriam-Webster
            </a>
          </p>
          <p>Current word: {previousWord}</p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div>
        <h3>Correct Words History:</h3>
        <div ref={correctWordsListRef} style={{ maxHeight: '200px', overflowY: 'scroll', border: '1px solid black', padding: '10px' }}>
          {correctWordsList.map((word, index) => (
            <p key={index}>{word}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpellerGUI;