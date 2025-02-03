import React from 'react';

function PersonaSelector({ onPersonaSelect, selectedPersona, personas = [] }) {

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Personas</h2>
      <div className="flex flex-col gap-2">
        {personas.map((persona) => (
          <button
            key={persona.id}
            onClick={() => onPersonaSelect(persona.id)}
            className={`px-8 py-6 text-xl font-medium rounded-lg transition-all duration-200 ${
              selectedPersona === persona.id
                ? 'bg-blue-600 text-white shadow-lg scale-102'
                : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-gray-300 hover:border-blue-300'
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
