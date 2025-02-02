import React, { useState, useEffect } from 'react';
import InputArea from './components/InputArea';
import DebatePanel from './components/DebatePanel';
import PersonaSelector from './components/PersonaSelector';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('all');
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

  const handleMessageSubmit = async (message) => {
    try {
      const payload = {
        new_message: message,
        speaker_id: selectedPersona,
        conversation_history: messages
      };
      
      console.log('Submitting:', payload);
      
      const response = await fetch('http://127.0.0.1:8000/ask_debate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(`Server error: ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      console.log('Response received:', data);
      
      // Add user's message if one was provided
      const newMessages = [...messages];
      if (message.trim()) {
        newMessages.push({ persona: "Moderator", content: message.trim() });
      }
      
      // Clean up AI response - remove any persona prefixes
      let cleanResponse = data.response;
      const personaNames = personas.map(p => p.name);
      personaNames.forEach(name => {
        // Remove "name:" prefix if it exists
        const prefix = new RegExp(`^${name}:\\s*`, 'i');
        cleanResponse = cleanResponse.replace(prefix, '');
        // Remove "As a name," prefix if it exists
        const asPrefix = new RegExp(`^As\\s+a\\s+${name},\\s*`, 'i');
        cleanResponse = cleanResponse.replace(asPrefix, '');
      });
      
      // Add cleaned AI response
      newMessages.push({ persona: data.persona.name, content: cleanResponse.trim() });
      setMessages(newMessages);
    } catch (error) {
      console.error('Error submitting question:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center mb-8">PersonaParley</h1>
        <PersonaSelector 
          onPersonaSelect={setSelectedPersona}
          selectedPersona={selectedPersona}
        />
        <DebatePanel messages={messages} />
        <InputArea 
          onSubmit={handleMessageSubmit}
          selectedPersona={selectedPersona} 
        />
      </div>
    </div>
  );
}

export default App;
