import React, { useState, useEffect } from 'react';
import InputArea from './components/InputArea';
import DebatePanel from './components/DebatePanel';
import PersonaSelector from './components/PersonaSelector';
import MessageContainer from './components/MessageContainer';
import LoadingBar from './components/LoadingBar';
import QuestionSuggestions from './components/QuestionSuggestions';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
console.log('API_URL:', API_URL);

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
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [inputText, setInputText] = useState('');

  const generateSuggestions = async (topic) => {
    try {
      const response = await fetch(`${API_URL}/generate_suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: topic })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate suggestions: ${response.status}`);
      }

      const { message_id } = await response.json();

      // Poll for results
      let result = null;
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        const pollResponse = await fetch(`${API_URL}/results/${message_id}`);
        if (pollResponse.ok) {
          result = await pollResponse.json();
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!result) {
        throw new Error('Timeout waiting for suggestions');
      }

      const suggestions = JSON.parse(result.response);
      setSuggestions(suggestions);

    } catch (error) {
      console.error('Error generating suggestions:', error);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion, personaId) => {
    if (personaId && personaId !== 'all') {
      const persona = personas.find(p => p.id === personaId);
      if (persona) {
        const firstName = persona.name.split(' ')[0];
        // Make first letter of suggestion lowercase when combining with persona name
        const lowercaseQuestion = suggestion.charAt(0).toLowerCase() + suggestion.slice(1);
        setInputText(`${firstName}, ${lowercaseQuestion}`);
      }
    } else {
      setInputText(suggestion);
    }
  };

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
    setInputText('');
    setSuggestions([]); // Add this line to clear suggestions
    localStorage.removeItem('messages');
    localStorage.removeItem('selectedPersona');
    localStorage.removeItem('personas');
  };

  const generatePersonas = async (question) => {
    try {
      const response = await fetch(`${API_URL}/personas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
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
    console.log('Attempting to submit initial question:', question);
    setIsLoading(true);
    try {
      if (question.trim().toLowerCase() === "test") {
        const mockPersonas = [
          { id: "all", name: "All", description: "Get responses from all personas" },
          { id: "philosopher", name: "Alex the Philosopher", description: "Expert in ethics and metaphysics" },
          { id: "scientist", name: "Sarah the Scientist", description: "Specialized in quantum physics" },
          { id: "historian", name: "Marcus the Historian", description: "Expert in ancient civilizations" },
          { id: "artist", name: "Luna the Artist", description: "Contemporary visual artist" }
        ];
        setPersonas(mockPersonas);
        
        const mockMessages = [
          { persona: "Moderator", content: "Let's explore the relationship between art and science." },
          { persona: "Alex the Philosopher", content: "**The intersection of art and science reveals fundamental truths about human perception.**\n\n### Key Points\n• Both domains seek to understand reality\n• Art provides intuitive insights while science offers empirical evidence\n\n> 🤔 We must consider how these approaches complement each other." },
          { persona: "Sarah the Scientist", content: "### Scientific Perspective\n\n**Research shows that artistic activities stimulate multiple brain regions simultaneously.**\n\n• Neural imaging reveals increased connectivity during creative tasks\n• The scientific method itself often requires creative thinking\n\n> 🧬 The boundary between art and science is more fluid than many realize." }
        ];
        setMessages(mockMessages);
        setSelectedPersona('all');
        await generateSuggestions("Let's explore the relationship between art and science.");
        return;
      }

      // Send initial request to generate personas
      const response = await fetch(`${API_URL}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      if (!response.ok) {
        throw new Error(`Failed to submit question: ${response.status}`);
      }

      const { message_id } = await response.json();
      
      // Poll for results
      let result = null;
      const maxAttempts = 30; // 30 seconds timeout
      for (let i = 0; i < maxAttempts; i++) {
        const pollResponse = await fetch(`${API_URL}/results/${message_id}`);
        if (pollResponse.ok) {
          result = await pollResponse.json();
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!result) {
        throw new Error('Timeout waiting for response');
      }

      // Parse and set personas
      const personas = JSON.parse(result.response);
      setPersonas(personas);
      setSelectedPersona('all');

      // Initialize conversation with moderator message
      const initialMessages = [{ persona: "Moderator", content: question }];
      setMessages(initialMessages);

      // Get initial responses from all personas
      const debateResponse = await fetch(`${API_URL}/ask_debate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_message: question,
          speaker_id: 'all',
          conversation_history: initialMessages
        })
      });

      if (!debateResponse.ok) {
        throw new Error(`Failed to get initial responses: ${debateResponse.status}`);
      }

      const { message_id: debateMessageId } = await debateResponse.json();

      // Poll for debate responses
      let debateResult = null;
      for (let i = 0; i < maxAttempts; i++) {
        const pollResponse = await fetch(`${API_URL}/results/${debateMessageId}`);
        if (pollResponse.ok) {
          debateResult = await pollResponse.json();
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!debateResult) {
        throw new Error('Timeout waiting for debate responses');
      }

      // Update messages with responses
      const responses = JSON.parse(debateResult.response);
      const newMessages = [...initialMessages];
      responses.forEach(response => {
        newMessages.push({
          persona: response.persona.name,
          content: response.content
        });
      });
      setMessages(newMessages);

      // Generate suggestions
      await generateSuggestions(question);
    } catch (error) {
      console.error('Detailed error:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessageSubmit = async (message) => {
    setIsLoading(true);
    try {
      if (message.trim().toLowerCase() === "test") {
        const newMessages = [...messages];
        newMessages.push({ 
          persona: "Moderator", 
          content: "How does technology influence this relationship?" 
        });
        newMessages.push({ 
          persona: "Luna the Artist", 
          content: "### Digital Revolution in Art\n\n**Technology has transformed artistic expression in unprecedented ways.**\n\n• Digital tools have created new art forms\n• Virtual reality opens new possibilities\n\n> 🎨 The fusion of technology and art is creating entirely new aesthetic experiences." 
        });
        newMessages.push({ 
          persona: "Marcus the Historian", 
          content: "### Historical Context\n\n**Throughout history, technological advances have always shaped artistic expression.**\n\n• The invention of photography changed painting forever\n• Digital age parallels the industrial revolution's impact\n\n> 📚 History shows us that art adapts and thrives with new technology." 
        });
        setMessages(newMessages);
        await generateSuggestions("How does technology influence this relationship?");
        return;
      }

      const payload = {
        new_message: message,
        speaker_id: selectedPersona,
        conversation_history: messages
      };

      const response = await fetch(`${API_URL}/ask_debate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to submit message: ${response.status}`);
      }

      const { message_id } = await response.json();

      // Add user's message
      const newMessages = [...messages];
      if (message.trim()) {
        newMessages.push({ persona: "Moderator", content: message.trim() });
      }
      setMessages(newMessages);

      // Poll for results
      let result = null;
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        const pollResponse = await fetch(`${API_URL}/results/${message_id}`);
        if (pollResponse.ok) {
          result = await pollResponse.json();
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!result) {
        throw new Error('Timeout waiting for response');
      }

      // Parse and add responses
      const responses = JSON.parse(result.response);
      if (selectedPersona === 'all') {
        responses.forEach(response => {
          newMessages.push({
            persona: response.persona.name,
            content: response.content
          });
        });
      } else {
        newMessages.push({
          persona: responses.persona.name,
          content: responses.response
        });
      }
      setMessages(newMessages);

      // Generate new suggestions
      await generateSuggestions(message);
    } catch (error) {
      console.error('Error submitting question:', error);
      // Add user-friendly error handling
      if (error.name === 'AbortError') {
        alert('Request timed out. Please try again.');
      } else {
        alert('Error submitting question. Please try again.');
      }
    } finally {
      setIsLoading(false);
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
            {isLoading && <LoadingBar />}
            
            <div className="space-y-6 w-full flex flex-col">
              {messages.length === 0 ? (
                <>
                  <MessageContainer>
                    <div className="h-full"></div>
                  </MessageContainer>
                  <InputArea 
                    onSubmit={handleInitialQuestion}
                    selectedPersona={selectedPersona}
                    isInitialQuestion={true}
                    personas={personas}
                    inputText={inputText}
                    setInputText={setInputText}
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
                    inputText={inputText}
                    setInputText={setInputText}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel for Suggestions */}
        {messages.length > 0 && (
          <QuestionSuggestions 
            suggestions={suggestions}
            onSuggestionClick={handleSuggestionClick}
            selectedPersona={selectedPersona}
          />
        )}
      </div>
    </div>
  );
}

export default App;
