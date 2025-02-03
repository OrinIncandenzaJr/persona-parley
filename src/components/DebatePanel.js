import React from 'react';
import ReactMarkdown from 'react-markdown';

function DebatePanel({ messages }) {
  return (
    <div className="max-h-[60vh] overflow-y-auto p-4 border border-gray-300 rounded-lg w-full bg-white shadow-md">
      <div className="max-w-2xl mx-auto">
        {messages.map((message, index) => (
          <div key={index} className="mb-4">
            <h3 className="font-bold text-lg">{message.persona}</h3>
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DebatePanel;
