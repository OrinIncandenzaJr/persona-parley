import React from 'react';

function PersonaSelector({ onPersonaSelect, selectedPersona, personas = [] }) {

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2 justify-center">
        {personas.map((persona) => (
          <button
            key={persona.id}
            onClick={() => onPersonaSelect(persona.id)}
            className={`px-4 py-2 rounded-full transition-all duration-200 ${
              selectedPersona === persona.id
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-300'
            }`}
          >
            {persona.name}
          </button>
        ))}
      </div>
      {selectedPersona && (
        <div className="mt-3 text-center text-sm text-blue-600 font-medium">
          Speaking as: {personas.find(p => p.id === selectedPersona)?.name || 'Unknown'}
        </div>
      )}
    </div>
  );
}

export default PersonaSelector;
