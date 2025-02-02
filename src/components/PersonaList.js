import React from 'react';

function PersonaList({ personas = [] }) {
  const personaArray = Array.isArray(personas) ? personas : [];
  
  return (
    <div>
      {personaArray.map((persona, index) => (
        <div key={index}>
          <h2>{persona.name}</h2>
          <p>{persona.description}</p>
        </div>
      ))}
    </div>
  );
}

export default PersonaList;
