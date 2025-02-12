import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import SpellerGUI from './spellerGUI';
import './DictionaryList.css';
import { dictionary as pr } from 'cmu-pronouncing-dictionary';

// Global variables
const STARTING_TIME = 5;
const SECONDS_GAINED_PER_CORRECT_WORD = 10;
const POINTS_PER_WORD = (wordLength, syllableCount) => Math.round((wordLength * syllableCount) / 2);

let currentWord = '';
let currentScore = 0;
let currentCorrectWords = 0;
let timeUpWord = '';
let previousWords = [];
let validWordFound = false;

const arpabetToIPA = {
  'AA': 'ɑ', 'AE': 'æ', 'AH': 'ʌ', 'AO': 'ɔ', 'AW': 'aʊ', 'AY': 'aɪ',
  'B': 'b', 'CH': 'tʃ', 'D': 'd', 'DH': 'ð', 'EH': 'ɛ', 'ER': 'ɝ',
  'EY': 'eɪ', 'F': 'f', 'G': 'ɡ', 'HH': 'h', 'IH': 'ɪ', 'IY': 'i',
  'JH': 'dʒ', 'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'NG': 'ŋ',
  'OW': 'oʊ', 'OY': 'ɔɪ', 'P': 'p', 'R': 'ɹ', 'S': 's', 'SH': 'ʃ',
  'T': 't', 'TH': 'θ', 'UH': 'ʊ', 'UW': 'u', 'V': 'v', 'W': 'w',
  'Y': 'j', 'Z': 'z', 'ZH': 'ʒ'
};

const convertArpabetToIPA = (arpabet) => {
  return arpabet.split(' ')
    .map(symbol => arpabetToIPA[symbol.replace(/[0-9]/g, '')] || symbol)
    .join(' ');
};

const DictionaryList = () => {
  const [word, setWord] = useState(null);
  const [definition, setDefinition] = useState('');
  const [usage, setUsage] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [syllableCount, setSyllableCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [wordSpelledCorrectly, setWordSpelledCorrectly] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(STARTING_TIME);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [levelSelected, setLevelSelected] = useState(false);
  const [correctWords, setCorrectWords] = useState(0);
  const [previousWord, setPreviousWord] = useState('');
  const [previousDefinition, setPreviousDefinition] = useState('');
  const [previousUsage, setPreviousUsage] = useState('');
  const [previousScore, setPreviousScore] = useState(0);
  const [previousCorrectWords, setPreviousCorrectWords] = useState(0);
  const [hintCost, setHintCost] = useState(0);
  const [correctWordsList, setCorrectWordsList] = useState([]);
  const [isNewGame, setIsNewGame] = useState(true);

  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const fetchControllerRef = useRef(null);

  const allowedPartsOfSpeech = ['noun', 'pronoun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection'];

  const getRandomLetter = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    return letters[Math.floor(Math.random() * letters.length)];
  };

  const calculateHintCost = (word) => {
    const consonants = word.replace(/[aeiou]/gi, '').length;
    return Math.ceil((0.75 * syllableCount * word.length * consonants) / 4);
  };

  const applyInvisibleStyle = (text, word) => {
    const firstPart = word.slice(0, Math.min(5, word.length));
    const regex = new RegExp(`\\b${firstPart}\\w*\\b`, 'gi');
    return text.replace(regex, '⭐');
  };

  const fetchWord = useCallback(async () => {
    if (gameOver || !gameStarted || !levelSelected || validWordFound) {
      return;
    }

    setLoading(true);
    setError(null);
    setWordSpelledCorrectly(false);
    setUserInput('');

    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    fetchControllerRef.current = new AbortController();
    const { signal } = fetchControllerRef.current;

    const fetchAttempt = async () => {
      try {
        const letter = getRandomLetter();
        const response = await axios.get(
          `https://api.datamuse.com/words?sp=${letter}*&md=s&max=1000`,
          { signal }
        );

        const filteredWords = response.data.filter(
          (w) =>
            w.numSyllables === syllableCount &&
            !w.word.includes('-') &&
            !w.word.includes(' ') &&
            !w.word.endsWith('s') &&
            !w.word.endsWith('ed') &&
            !w.word.endsWith('ing') &&
            !previousWords.includes(w.word) &&
            !correctWordsList.includes(w.word)
        );

        if (filteredWords.length > 0) {
          const selectedWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
          const definitionFound = await fetchDefinition(selectedWord.word, selectedWord.numSyllables);
          if (definitionFound) {
            setLoading(false);
            fetchControllerRef.current = null;
            validWordFound = true;
            setIsNewGame(false);
            return;
          } else {
            setTimeout(fetchAttempt, 100);
          }
        } else {
          setTimeout(fetchAttempt, 100);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setLoading(false);
        }
      }
    };

    fetchAttempt();
  }, [syllableCount, gameOver, gameStarted, levelSelected, correctWordsList]);

  const fetchDefinition = async (word, numSyllables) => {
    try {
      const response = await axios.get(
        `https://dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=67df93ea-34e8-49ad-8f06-274ea6b254b5`
      );
  
      if (response.data.length > 0) {
        const partOfSpeech = response.data[0].fl || 'unknown';
        const maskedDefinition = response.data[0].shortdef ? applyInvisibleStyle(response.data[0].shortdef[0], word) : 'No definition found.';
        const exampleUsage = response.data[0].def[0].sseq[0][0][1].dt.find(dt => dt[0] === 'vis')?.[1]?.[0]?.t || 'No usage example found.';
        
        setWord(word);
        setDefinition(applyInvisibleStyle(maskedDefinition, word));
        setPartOfSpeech(partOfSpeech);
        setUsage(applyInvisibleStyle(exampleUsage.replace(/{wi}|{\/wi}/g, ''), word));
        setHintCost(calculateHintCost(word));
        speakWordAndDefinition(`Spell ${word}. Definition: ${response.data[0].shortdef ? response.data[0].shortdef[0] : 'No definition found.'}`);
        inputRef.current.focus();
        console.log(`Fetched word: ${word}`);
        currentWord = word;
        timeUpWord = word;
        validWordFound = true;
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  const handleUserInputChange = (e) => {
    const input = e.target.value;
    setUserInput(input);

    if (input.toLowerCase() === word.toLowerCase()) {
      setWordSpelledCorrectly(true);
      setCorrectWords((prevCorrectWords) => {
        const newCorrectWords = prevCorrectWords + 1;
        setPreviousCorrectWords(newCorrectWords);
        currentCorrectWords = newCorrectWords;
        return newCorrectWords;
      });
      const newScore = POINTS_PER_WORD(word.length, syllableCount);
      setScore((prevScore) => {
        const updatedScore = prevScore + newScore;
        setPreviousScore(updatedScore);
        currentScore = updatedScore;
        return updatedScore;
      });
      setTimeLeft(timeLeft + SECONDS_GAINED_PER_CORRECT_WORD);
      previousWords.push(word);
      setCorrectWordsList((prevList) => [...prevList, word]);
      validWordFound = false;
      setTimeout(() => fetchWord(), 100);

      document.querySelector('.score').classList.add('increase');
      document.querySelector('.correct-words').classList.add('increase');
      setTimeout(() => {
        document.querySelector('.score').classList.remove('increase');
        document.querySelector('.correct-words').classList.remove('increase');
      }, 200);
      console.log(`Correct word: ${word}`);
      console.log(`Current score: ${score}`);
      console.log(`Correct words: ${correctWords}`);
    }
  };

  const handleSyllableCountChange = (level) => {
    console.log('handleSyllableCountChange called with level:', level);
    console.log('Current gameOver state:', gameOver);
    console.log('Current gameStarted state:', gameStarted);
    setSyllableCount(level);
    setLevelSelected(true);
    setGameStarted(true);
    previousWords = [];
    if (gameOver || !gameStarted) {
      console.log('Game is over or not started, resetting game state');
      setTimeLeft(STARTING_TIME);
      setScore(0);
      setCorrectWords(0);
      setPreviousScore(0);
      setPreviousCorrectWords(0);
      setCorrectWordsList([]);
      setIsNewGame(true);
      validWordFound = false; // Ensure validWordFound is reset
      setGameOver(false);
    } else {
      console.log('Game is not over, switching levels');
      setIsNewGame(false);
      validWordFound = false; // Ensure validWordFound is reset
    }
    console.log('Fetching new word');
    fetchWord();
  };
  
  useEffect(() => {
    const handleTimerAndButtons = () => {
      if (loading || !validWordFound) {
        document.querySelectorAll('button').forEach(button => button.disabled = true);
        clearInterval(timerRef.current);
      } else {
        document.querySelectorAll('button').forEach(button => button.disabled = false);
        if (gameStarted && levelSelected && !gameOver && validWordFound) {
          timerRef.current = setInterval(handleTimeDecrement, 1000);
        }
      }
    };
  
    handleTimerAndButtons();
  
    if (gameStarted && levelSelected && isNewGame) {
      fetchWord();
    }
  
    if (word) {
      setPreviousWord(word);
      setPreviousDefinition(definition);
      setPreviousUsage(usage);
      currentWord = word;
      timeUpWord = word;
      console.log(`Current word: ${word}`);
      inputRef.current.focus();
    }
  
    if (isNewGame) {
      document.querySelectorAll('button').forEach(button => button.disabled = false);
    }
  
    return () => clearInterval(timerRef.current);
  }, [loading, validWordFound, gameStarted, levelSelected, gameOver, word, definition, usage, isNewGame, fetchWord]);

  const handleSkip = () => {
    if (score >= Math.round(hintCost / 2)) {
      setScore(score - Math.round(hintCost / 2));
      validWordFound = false;
      fetchWord();
    }
  };

  const speakWordAndDefinition = (text) => {
    if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/⭐/g, word));
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Error speaking word and definition:', error);
      }
    } else {
      console.error('Speech synthesis not supported in this browser.');
    }
  };

  const speakWord = (word) => {
    if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
        const pronunciation = pr[word.toLowerCase()];
        const ipaPronunciation = pronunciation ? convertArpabetToIPA(pronunciation) : word;
        const utterance = new SpeechSynthesisUtterance(ipaPronunciation);
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Error speaking word:', error);
      }
    } else {
      console.error('Speech synthesis not supported in this browser.');
    }
  };

  const speakDefinition = (definition) => {
    if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(definition.replace(/⭐/g, word));
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Error speaking definition:', error);
      }
    } else {
      console.error('Speech synthesis not supported in this browser.');
    }
  };

  const speakUsage = (usage) => {
    if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(usage.replace(/⭐/g, word));
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Error speaking usage:', error);
      }
    } else {
      console.error('Speech synthesis not supported in this browser.');
    }
  };

  const endGameTimeUp = async () => {
    const finalScore = currentScore;
    const finalCorrectWords = currentCorrectWords;
    console.log('End game (time up) triggered');
    console.log('Final score:', finalScore);
    console.log('Correct words:', finalCorrectWords);
    console.log('Previous word:', timeUpWord);

    let latestDefinition = definition;
    let latestUsage = usage;
    try {
      const response = await axios.get(
        `https://dictionaryapi.com/api/v3/references/collegiate/json/${timeUpWord}?key=67df93ea-34e8-49ad-8f06-274ea6b254b5`
      );
      if (response.data.length > 0 && response.data[0].shortdef) {
        latestDefinition = response.data[0].shortdef[0].replace(/{wi}|{\/wi}/g, '');
        const exampleUsage = response.data[0].def[0].sseq[0][0][1].dt.find(dt => dt[0] === 'vis')?.[1]?.[0]?.t;
        if (exampleUsage) {
          latestUsage = exampleUsage.replace(/{wi}|{\/wi}/g, '');
        }
      }
    } catch (error) {
      console.error('Error fetching latest definition and usage:', error);
    }

    setPreviousScore(finalScore);
    setPreviousCorrectWords(finalCorrectWords);
    setPreviousWord(timeUpWord);
    setPreviousDefinition(latestDefinition);
    setPreviousUsage(latestUsage);
    setGameOver(true);
    setGameStarted(false);
    setLevelSelected(false);
    clearInterval(timerRef.current);
    speakTimeUpMessage(finalScore, finalCorrectWords, latestDefinition, latestUsage);
    setTimeout(() => {
      setScore(0);
      setCorrectWords(0);
      setTimeLeft(STARTING_TIME);
    }, 1000);
  };

  const endGameGiveUp = () => {
    const finalScore = currentScore;
    const finalCorrectWords = currentCorrectWords;
    console.log('End game (give up) triggered');
    console.log('Final score:', finalScore);
    console.log('Correct words:', finalCorrectWords);
    console.log('Previous word:', currentWord);
    setPreviousScore(finalScore);
    setPreviousCorrectWords(finalCorrectWords);
    setPreviousWord(currentWord);
    setPreviousDefinition(definition);
    setPreviousUsage(usage);
    setGameOver(true);
    setGameStarted(false);
    setLevelSelected(false);
    clearInterval(timerRef.current);
    speakGiveUpMessage(finalScore, finalCorrectWords, definition, usage);
    setTimeout(() => {
      setScore(0);
      setCorrectWords(0);
      setTimeLeft(STARTING_TIME);
    }, 1000);
  };

  const handleGiveUp = () => {
    endGameGiveUp();
  };

  const handleTimeUp = () => {
    console.log('Time up triggered');
    endGameTimeUp();
  };

  const speakTimeUpMessage = (finalScore, finalCorrectWords, definition, usage) => {
    const message = `Time's up! Your score is ${finalScore}. You got ${finalCorrectWords} words right. The word you timed out on is ${timeUpWord}. Definition: ${definition}. Usage: ${usage}. Please choose a level to play a new game.`;
    console.log('Time up message:', message);
    speakMessage(message);
  };

  const speakGiveUpMessage = (finalScore, finalCorrectWords, definition, usage) => {
    const message = `Thank you for playing! Your score is ${finalScore}. You got ${finalCorrectWords} words right. The word you gave up on is ${currentWord}. Definition: ${definition}. Usage: ${usage}. Please choose a level to play a new game.`;
    console.log('Give up message:', message);
    speakMessage(message);
  };

  const speakMessage = (message) => {
    if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Error speaking message:', error);
      }
    } else {
      console.error('Speech synthesis not supported in this browser.');
    }
  };

  const handleTimeDecrement = () => {
    setTimeLeft((prevTimeLeft) => {
      if (prevTimeLeft > 0) {
        return prevTimeLeft - 1;
      } else {
        handleTimeUp();
        return 0;
      }
    });
  };

  const handleHint = () => {
    if (word && score >= hintCost) {
      const hintMessage = `The word starts with ${word.charAt(0)} and has ${word.length} letters.`;
      setScore((prevScore) => {
        const updatedScore = prevScore - hintCost;
        setPreviousScore(updatedScore);
        currentScore = updatedScore;
        return updatedScore;
      });
      if ('speechSynthesis' in window) {
        try {
          speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(hintMessage);
          speechSynthesis.speak(utterance);
        } catch (error) {
          console.error('Error speaking hint message:', error);
        }
      } else {
        console.error('Speech synthesis not supported in this browser.');
      }

      document.querySelector('.score').classList.add('decrease');
      setTimeout(() => {
        document.querySelector('.score').classList.remove('decrease');
      }, 200);
    }
  };

  const handlePronunciation = async () => {
    if (word) {
      try {
        speechSynthesis.cancel();
        const response = await axios.get(
          `https://dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=67df93ea-34e8-49ad-8f06-274ea6b254b5`
        );

        if (response.data.length > 0 && response.data[0].hwi && response.data[0].hwi.prs) {
          const audioFile = response.data[0].hwi.prs[0].sound.audio;
          const audioUrl = `https://media.merriam-webster.com/soundc11/${audioFile.charAt(0)}/${audioFile}.wav`;
          const audio = new Audio(audioUrl);
          audio.play();
        } else {
          console.error('Pronunciation not found.');
        }
      } catch (error) {
        console.error('Error fetching pronunciation:', error);
      }
    }
  };

  return (
    <SpellerGUI
      syllableCount={syllableCount}
      timeLeft={timeLeft}
      score={score}
      correctWords={correctWords}
      loading={loading}
      userInput={userInput}
      wordSpelledCorrectly={wordSpelledCorrectly}
      definition={definition}
      partOfSpeech={partOfSpeech}
      usage={usage}
      previousScore={previousScore}
      previousCorrectWords={previousCorrectWords}
      previousWord={previousWord}
      error={error}
      handleSyllableCountChange={handleSyllableCountChange}
      handleGiveUp={handleGiveUp}
      handleHint={handleHint}
      handleSkip={handleSkip}
      handlePronunciation={handlePronunciation}
      handleUserInputChange={handleUserInputChange}
      speakWord={speakWord}
      speakDefinition={speakDefinition}
      speakUsage={speakUsage}
      hintCost={hintCost}
      gameOver={gameOver}
      inputRef={inputRef}
      word={word}
      correctWordsList={correctWordsList}
    />
  );
};

export default DictionaryList;