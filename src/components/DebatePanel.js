import React from 'react';
import ReactMarkdown from 'react-markdown';

function DebatePanel({ messages }) {
  return (
    <div className="max-h-[60vh] overflow-y-auto p-4 border-2 border-blue-200 rounded-lg bg-gray-50 shadow-lg w-full">
      <div className="flex flex-col space-y-4">
        {messages.map((message, index) => {
          const isModerator = message.persona === 'Moderator';
          const isConsecutive = index > 0 && messages[index - 1].persona === message.persona;
          
          return (
            <div 
              key={index} 
              className={`flex ${isModerator ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-1' : 'mt-4'}`}
            >
              {!isModerator && !isConsecutive && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-2">
                  {message.persona[0]}
                </div>
              )}
              <div className="flex flex-col">
                {!isConsecutive && (
                  <span className={`text-xs ${isModerator ? 'text-right mr-2' : 'ml-2'} text-gray-600 mb-1`}>
                    {message.persona}
                  </span>
                )}
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isModerator
                      ? 'bg-blue-500 text-white ml-auto'
                      : 'bg-white text-gray-800 border border-gray-200'
                  } ${isConsecutive ? 'mt-1' : ''}`}
                >
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown 
                      className={isModerator ? 'text-white' : 'text-gray-700'}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
              {isModerator && !isConsecutive && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center ml-2 mt-2">
                  <span className="text-white">M</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DebatePanel;
