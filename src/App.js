import React, { useState } from 'react';
import InputArea from './components/InputArea';
import DebatePanel from './components/DebatePanel';
import PersonaSelector from './components/PersonaSelector';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('');

  const handleQuestionSubmit = async (question) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/ask_debate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: question,
          persona_id: selectedPersona 
        }),
      });
      
      const data = await response.json();
      
      setMessages(prevMessages => [
        ...prevMessages,
        { persona: 'User', content: question },
        { persona: 'AI', content: data.response }
      ]);
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
        <InputArea onSubmit={handleQuestionSubmit} />
      </div>
    </div>
  );
}

export default App;
