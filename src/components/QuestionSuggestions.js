import React from 'react';

function QuestionSuggestions({ suggestions = [], onSuggestionClick, selectedPersona }) {
  return (
    <div className="w-80 h-screen p-6 bg-gray-800 border-l border-gray-700">
      <h2 className="text-lg font-semibold mb-4 text-white">Suggested Questions</h2>
      <div className="flex flex-col gap-3">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion, selectedPersona)}
            className="p-3 text-left text-sm bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600 hover:border-blue-500"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuestionSuggestions;
