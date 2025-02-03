import React from 'react';

function PersonaList({ personas = [] }) {
  const personaArray = Array.isArray(personas) ? personas : [];
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {personaArray.map((persona, index) => (
        <div 
          key={index}
          className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{persona.name}</h2>
          <p className="text-gray-600">{persona.description}</p>
        </div>
      ))}
    </div>
  );
}

export default PersonaList;
