import React from 'react';

function PersonaSelector({ onPersonaSelect, selectedPersona, personas = [] }) {

  return (
    <div className="mb-4">
      <select
        className="w-full p-2 border rounded"
        value={selectedPersona}
        onChange={(e) => onPersonaSelect(e.target.value)}
      >
        <option value="">Select a Persona</option>
        {personas.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {persona.name}
          </option>
        ))}
      </select>
      <div className="mt-2 text-gray-600">
        {selectedPersona ? 
          `Selected: ${personas.find(p => p.id === selectedPersona)?.name || selectedPersona}` : 
          'No Persona Selected'}
      </div>
    </div>
  );
}

export default PersonaSelector;
