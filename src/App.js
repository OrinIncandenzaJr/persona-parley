import React, { useState, useEffect } from 'react';
import InputArea from './components/InputArea';
import DebatePanel from './components/DebatePanel';
import PersonaSelector from './components/PersonaSelector';
import MessageContainer from './components/MessageContainer';
import LoadingBar from './components/LoadingBar';
import QuestionSuggestions from './components/QuestionSuggestions';
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
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const generateSuggestions = async (topic) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/generate_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: topic }),
      });
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleMessageSubmit(suggestion);
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
    setIsLoading(true);
    try {
      if (question.trim().toLowerCase() === "test") {
        const mockPersonas = [
          { 
            id: "all", 
            name: "All", 
            description: "Get responses from all personas" 
          },
          { 
            id: "philosopher", 
            name: "Alex the Philosopher", 
            description: "Expert in ethics and metaphysics" 
          },
          { 
            id: "scientist", 
            name: "Sarah the Scientist", 
            description: "Specialized in quantum physics" 
          },
          { 
            id: "historian", 
            name: "Marcus the Historian", 
            description: "Expert in ancient civilizations" 
          },
          { 
            id: "artist", 
            name: "Luna the Artist", 
            description: "Contemporary visual artist" 
          }
        ];
        setPersonas(mockPersonas);
        
        const mockMessages = [
          { 
            persona: "Moderator", 
            content: "Let's explore the relationship between art and science." 
          },
          { 
            persona: "Alex the Philosopher", 
            content: "**The intersection of art and science reveals fundamental truths about human perception.**\n\n### Key Points\n• Both domains seek to understand reality\n• Art provides intuitive insights while science offers empirical evidence\n\n> 🤔 We must consider how these approaches complement each other." 
          },
          { 
            persona: "Sarah the Scientist", 
            content: "### Scientific Perspective\n\n**Research shows that artistic activities stimulate multiple brain regions simultaneously.**\n\n• Neural imaging reveals increased connectivity during creative tasks\n• The scientific method itself often requires creative thinking\n\n> 🧬 The boundary between art and science is more fluid than many realize." 
          }
        ];
        setMessages(mockMessages);
        setSelectedPersona('all');
        await generateSuggestions("Let's explore the relationship between art and science.");
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
          await generateSuggestions(question);
          
          setMessages(newMessages);
          await generateSuggestions(question);
        } catch (error) {
          console.error('Error getting initial responses:', error);
        }
      }
    } catch (error) {
      console.error('Error:', error);
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
      
      // Clean up AI response - remove any persona prefixes and introductions
      let cleanResponse = data.response;
      const personaNames = personas.map(p => p.name);
      personaNames.forEach(name => {
        // Remove various forms of persona introductions
        const patterns = [
          `^As\\s+${name}\\s+the\\s+[^,]+,\\s*`,    // Matches "As Akiko the Anime Fan, "
          `^${name}\\s+the\\s+[^,]+,\\s*`,          // Matches "Akiko the Anime Fan, "
          `^${name}:\\s*`,                          // "Name:"
          `^${name}\\s*:`,                          // "Name :"
          `^${name}\\s+the\\s+[^:]+:\\s*`,         // "Name the Title:"
          `^As\\s+a\\s+${name},\\s*`,              // "As a Name,"
          `^As\\s+${name},\\s*`,                    // "As Name,"
          `^${name}\\s+here[.,]\\s*`,              // "Name here."
          `^This\\s+is\\s+${name}[.,]\\s*`,        // "This is Name."
          `^Speaking\\s+as\\s+${name}[.,]\\s*`,    // "Speaking as Name."
          `^From\\s+${name}'s\\s+perspective[.,]\\s*`, // "From Name's perspective."
          `^As\\s+${name}\\s+I\\s+`,               // "As Name I"
          `^${name}\\s+the\\s+[^:]+\\s*[:-]\\s*`,  // "Name the Title: " or "Name the Title - "
        ];
        
        patterns.forEach(pattern => {
          const regex = new RegExp(pattern, 'i');
          cleanResponse = cleanResponse.replace(regex, '');
        });
      });
      
      // Handle responses based on whether it's "all" or individual persona
      if (selectedPersona === 'all') {
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
      } else {
        // Add single persona response
        newMessages.push({ 
          persona: data.persona.name, 
          content: cleanResponse.trim() 
        });
        await generateSuggestions(message);
      }
      setMessages(newMessages);
      
    } catch (error) {
      console.error('Error submitting question:', error);
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

        {/* Right Panel for Suggestions */}
        {messages.length > 0 && (
          <QuestionSuggestions 
            suggestions={suggestions}
            onSuggestionClick={handleSuggestionClick}
          />
        )}
      </div>
    </div>
  );
}

export default App;
