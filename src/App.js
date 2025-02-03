import React, { useState } from 'react';
import InputArea from './components/InputArea';
import DebatePanel from './components/DebatePanel';
import PersonaSelector from './components/PersonaSelector';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('all');
  const [personas, setPersonas] = useState([]);

  const generatePersonas = async (question) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      setPersonas(data);
      setSelectedPersona('all'); // Reset to "All" when new personas are generated
      return data;
    } catch (error) {
      console.error('Error generating personas:', error);
      return null;
    }
  };

  // Function to handle initial question submission
  const handleInitialQuestion = async (question) => {
    const personas = await generatePersonas(question);
    if (personas) {
      const initialMessages = [{ persona: "Moderator", content: question }];
      setMessages(initialMessages);
      
      // Automatically get responses from all personas
      const payload = {
        new_message: question,
        speaker_id: 'all',
        conversation_history: initialMessages
      };
      
      try {
        const response = await fetch('http://127.0.0.1:8000/ask_debate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          throw new Error('Failed to get initial responses');
        }
        
        const data = await response.json();
        const newMessages = [...initialMessages];
        
        // Split the combined response by persona sections
        const responses = data.response.split('### ').filter(Boolean);
        responses.forEach(response => {
          const [personaName, ...contentParts] = response.split('\n\n');
          const content = contentParts.join('\n\n').trim();
          if (personaName && content) {
            newMessages.push({
              persona: personaName.trim(),
              content: content
            });
          }
        });
        
        setMessages(newMessages);
      } catch (error) {
        console.error('Error getting initial responses:', error);
      }
    }
  };

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">PersonaParley</h1>
          <p className="text-gray-600">Multi-perspective AI Debate Platform</p>
        </div>
        {messages.length === 0 ? (
          <InputArea 
            onSubmit={handleInitialQuestion}
            selectedPersona={selectedPersona}
            isInitialQuestion={true}
          />
        ) : (
          <>
            <PersonaSelector 
              onPersonaSelect={setSelectedPersona}
              selectedPersona={selectedPersona}
              personas={personas}
            />
            <DebatePanel messages={messages} />
            <InputArea 
              onSubmit={handleMessageSubmit}
              selectedPersona={selectedPersona}
              isInitialQuestion={false}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
