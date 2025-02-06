import React from 'react';
import ReactMarkdown from 'react-markdown';

function DebatePanel({ messages }) {
  return (
    <div className="max-h-[60vh] overflow-y-auto p-4 border-2 border-gray-700 rounded-lg bg-gray-800 shadow-lg w-full">
      <div className="flex flex-col space-y-4">
        {messages.map((message, index) => {
          const isModerator = message.persona === 'Moderator';
          const isConsecutive = index > 0 && messages[index - 1].persona === message.persona;
          
          return (
            <div 
              key={index} 
              // Apply different justification and a slide-in animation on every message group
              className={`flex ${isModerator ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-1' : 'mt-4'} animate-slideIn`}
            >
              {/* Show avatar for non-moderator messages only when this is the first in a block */}
              {!isModerator && !isConsecutive && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center mr-2 mt-2">
                  <span className="font-bold text-lg text-blue-300">
                    {message.persona.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex flex-col">
                {/* Only show the speaker’s name if this is not a consecutive message */}
                {!isConsecutive && (
                  <span className={`text-xs ${isModerator ? 'text-right mr-2' : 'ml-2'} text-gray-300 mb-1`}>
                    {message.persona}
                  </span>
                )}
                <div 
                  // Added shadow to all bubbles; for moderator messages, added a border for a distinct look.
                  className={`max-w-[80%] rounded-lg px-4 py-2 shadow ${
                    isModerator
                      ? 'bg-blue-600 text-white ml-auto border border-blue-700'
                      : 'bg-gray-700 text-gray-100 border border-gray-600'
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
              {/* Show moderator avatar on the right side only when not a consecutive message */}
              {isModerator && !isConsecutive && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center ml-2 mt-2">
                  <span className="font-bold text-lg text-white">M</span>
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
