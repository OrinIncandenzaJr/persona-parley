import React, { useState } from 'react';

function InputArea({ onSubmit, selectedPersona, isInitialQuestion, personas = [] }) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(inputText);
    setInputText('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex items-center space-x-2 p-4">
      <input
        type="text"
        style={{ minHeight: '60px' }}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        className="flex-grow p-2 border border-gray-600 rounded-lg shadow-sm bg-gray-700 text-gray-100 placeholder-gray-400"
        placeholder={
          isInitialQuestion 
            ? "" 
            : selectedPersona === 'all'
              ? "Ask all personas to respond..."
              : selectedPersona
                ? `Ask ${personas.find(p => p.id === selectedPersona)?.name || 'Unknown'} a question...`
                : "Ask the whole panel a question"
        }
        disabled={!isInitialQuestion && !selectedPersona}
      />
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Submit
      </button>
    </form>
  );
}

export default InputArea;
