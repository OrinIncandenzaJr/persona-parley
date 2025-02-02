import React, { useState } from 'react';

function InputArea({ onSubmit, selectedPersona }) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(inputText);
    setInputText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 p-4">
      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        className="flex-grow p-2 border border-gray-300 rounded-lg"
        placeholder={inputText.trim() ? `Type message as Moderator...` : `${selectedPersona === 'all' ? 'Press Submit to get responses from all personas' : selectedPersona ? 'Press Submit to let selected persona respond' : 'Select a persona first'}`}
        disabled={!selectedPersona}
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
