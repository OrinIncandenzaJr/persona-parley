import React from 'react';
import ReactMarkdown from 'react-markdown';

function DebatePanel({ messages }) {
  return (
    <div className="max-h-[60vh] overflow-y-auto p-4 border-2 border-blue-200 rounded-lg bg-gray-100 shadow-lg w-full">
      <div className="flex flex-col space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.persona === 'Moderator' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.persona === 'Moderator'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-white text-gray-800 rounded-bl-none shadow-md'
              }`}
            >
              <div className={`text-sm font-semibold mb-1 ${
                message.persona === 'Moderator' ? 'text-blue-100' : 'text-blue-500'
              }`}>
                {message.persona}
              </div>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown 
                  className={message.persona === 'Moderator' ? 'text-white' : 'text-gray-700'}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DebatePanel;
