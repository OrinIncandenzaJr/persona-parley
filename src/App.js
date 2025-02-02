import React, { useState } from 'react';
import InputArea from './components/InputArea';
import DebatePanel from './components/DebatePanel';
import PersonaSelector from './components/PersonaSelector';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('');

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
        newMessages.push({ persona: "Moderator", content: message });
      }
      // Add AI response
      newMessages.push({ persona: data.persona.name, content: data.response });
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
