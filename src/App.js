{messages.length === 0 ? (
  <div className="space-y-6 w-full">
    <div className="min-h-[60vh] border-2 border-gray-700 rounded-lg bg-gray-800 shadow-lg w-full flex-shrink-0"></div>
    <InputArea 
      onSubmit={handleInitialQuestion}
      selectedPersona={selectedPersona}
      isInitialQuestion={true}
      personas={personas}
    />
  </div>
) : (
  <div className="space-y-6 w-full">
    <DebatePanel messages={messages} />
    <InputArea 
      onSubmit={handleMessageSubmit}
      selectedPersona={selectedPersona}
      isInitialQuestion={false}
      personas={personas}
    />
  </div>
)}
