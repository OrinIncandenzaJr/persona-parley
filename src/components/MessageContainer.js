import React from 'react';

function MessageContainer({ children }) {
  return (
    <div className="min-h-[60vh] max-h-[60vh] border-2 border-gray-700 rounded-lg bg-gray-800 shadow-lg w-full flex-shrink-0 overflow-y-scroll p-4">
      <div className="flex flex-col space-y-4">
        {children}
      </div>
    </div>
  );
}

export default MessageContainer;
