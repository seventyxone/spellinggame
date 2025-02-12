import React, { useState } from 'react';
import './App.css';
import DictionaryList from './DictionaryList';

function App() {
  const [wordDetails, setWordDetails] = useState(null);

  const handleWordFetch = (details) => {
    setWordDetails(details);
  };

  return (
    <div className="App">
      <div>
        <DictionaryList onWordFetch={handleWordFetch} />
      </div>
      {wordDetails && (
        <div>
          <h2>{wordDetails.word}</h2>
          <p><strong>Definition:</strong> {wordDetails.definition}</p>
          <p><strong>Part of Speech:</strong> {wordDetails.partOfSpeech}</p>
          <p><strong>Usage:</strong> {wordDetails.usage}</p>
        </div>
      )}
    </div>
  );
}

export default App;