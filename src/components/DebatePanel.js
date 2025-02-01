import React from 'react';

function DebatePanel({ messages }) {
  return (
    <div className="max-h-96 overflow-y-auto p-4 border border-gray-300 rounded-lg">
      {messages.map((message, index) => (
        <div key={index} className="mb-4">
          <h3 className="font-bold text-lg">{message.persona}</h3>
          <p className="text-gray-700">{message.content}</p>
        </div>
      ))}
    </div>
  );
}

export default DebatePanel;
