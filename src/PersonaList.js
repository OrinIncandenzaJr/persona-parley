import React from 'react';

function PersonaList({ personas }) {
  return (
    <div>
      {personas.map((persona, index) => (
        <div key={index}>
          <h2>{persona.name}</h2>
          <p>{persona.description}</p>
        </div>
      ))}
    </div>
  );
}

export default PersonaList;
