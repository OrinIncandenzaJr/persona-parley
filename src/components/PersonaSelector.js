import React from 'react';

function PersonaSelector({ onPersonaSelect, selectedPersona, personas }) {
  // Ensure personas is always an array
  const personaList = Array.isArray(personas) ? personas : [];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Personas</h2>
      <div className="flex flex-col gap-4 items-stretch">
        {personaList.map((persona) => (
          <button
            key={persona.id}
            onClick={() => onPersonaSelect(selectedPersona === persona.id ? null : persona.id)}
            className={`px-10 py-8 text-2xl font-medium rounded-lg transition-all duration-200 ${
              selectedPersona === persona.id
                ? 'bg-blue-600 text-white shadow-lg scale-102'
                : 'bg-gray-700 text-gray-100 hover:bg-gray-600 border-2 border-gray-600 hover:border-blue-500'
            }`}
          >
            {persona.name}
          </button>
        ))}
      </div>
      {selectedPersona && (
        <div className="mt-3 text-center text-sm text-blue-400 font-medium">
          Speaking as: {personaList.find(p => p.id === selectedPersona)?.name || 'Unknown'}
        </div>
      )}
    </div>
  );
}

export default PersonaSelector;
