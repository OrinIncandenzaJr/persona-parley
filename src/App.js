import React, { useState, useEffect } from 'react';
import InputArea from './components/InputArea';
import DebatePanel from './components/DebatePanel';
import PersonaSelector from './components/PersonaSelector';
import './App.css';

function App() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedPersona, setSelectedPersona] = useState(() => {
    const saved = localStorage.getItem('selectedPersona');
    return saved || 'all';
  });
  const [personas, setPersonas] = useState(() => {
    const saved = localStorage.getItem('personas');
    return saved ? JSON.parse(saved) : [];
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('messages', JSON.stringify(messages));
    localStorage.setItem('selectedPersona', selectedPersona);
    localStorage.setItem('personas', JSON.stringify(personas));
  }, [messages, selectedPersona, personas]);

  const handleReset = () => {
    setMessages([]);
    setSelectedPersona('all');
    setPersonas([]);
    localStorage.removeItem('messages');
    localStorage.removeItem('selectedPersona');
    localStorage.removeItem('personas');
  };

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
    if (question.trim().toLowerCase() === "test") {
      const mockPersonas = [
        { id: "p1", name: "Philosopher" },
        { id: "p2", name: "Scientist" },
        { id: "p3", name: "Artist" }
      ];
      setPersonas(mockPersonas);
      
      const mockMessages = [
        { persona: "Moderator", content: "Let's discuss the nature of consciousness." },
        { persona: "Philosopher", content: "Consciousness is fundamentally a question of subjective experience and qualia. We must consider the hard problem of consciousness." },
        { persona: "Scientist", content: "From a neuroscientific perspective, consciousness emerges from complex neural networks and can be studied through brain activity patterns." },
        { persona: "Artist", content: "Consciousness is like a canvas where our experiences, dreams, and emotions blend together to create the masterpiece of human experience." }
      ];
      setMessages(mockMessages);
      setSelectedPersona('all');
      return;
    }

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
    if (message.trim().toLowerCase() === "test") {
      const newMessages = [...messages];
      newMessages.push({ persona: "Moderator", content: message });
      newMessages.push({ persona: "Philosopher", content: "This is a test response from the Philosopher persona discussing the topic at hand." });
      newMessages.push({ persona: "Scientist", content: "Here's a scientific perspective on the matter for testing purposes." });
      newMessages.push({ persona: "Artist", content: "And this is how an artist might interpret this situation creatively." });
      setMessages(newMessages);
      return;
    }
    
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="flex">
        {/* Left Panel for Personas */}
        <div className="w-96 h-screen p-6 bg-gray-800 border-r border-gray-700">
          <PersonaSelector 
            onPersonaSelect={setSelectedPersona}
            selectedPersona={selectedPersona}
            personas={personas}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-4 sm:p-8 overflow-hidden">
          <div className="max-w-4xl w-full mx-auto flex flex-col">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Persona Parley</h1>
              <p className="text-gray-300">Multi-perspective AI Debate Platform</p>
              <button
                onClick={handleReset}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Reset Conversation
              </button>
            </div>
            
            <div className="space-y-6 w-full flex flex-col">
              {messages.length === 0 ? (
                <>
                  <div className="min-h-[60vh] border-2 border-gray-700 rounded-lg bg-gray-800 shadow-lg w-full flex-shrink-0 stable-scrollbar p-4">
                    <div className="flex flex-col space-y-4">
                      {/* Empty state content */}
                    </div>
                  </div>
                  <InputArea 
                    onSubmit={handleInitialQuestion}
                    selectedPersona={selectedPersona}
                    isInitialQuestion={true}
                    personas={personas}
                  />
                </>
              ) : (
                <>
                  <DebatePanel messages={messages} />
                  <InputArea 
                    onSubmit={handleMessageSubmit}
                    selectedPersona={selectedPersona}
                    isInitialQuestion={false}
                    personas={personas}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
