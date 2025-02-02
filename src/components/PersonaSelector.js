import React, { useState, useEffect } from 'react';

function PersonaSelector({ onPersonaSelect, selectedPersona }) {
  const [personas, setPersonas] = useState([]);

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/personas');
        const data = await response.json();
        setPersonas(data);
      } catch (error) {
        console.error('Error fetching personas:', error);
      }
    };

    fetchPersonas();
  }, []);

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
