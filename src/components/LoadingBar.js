function LoadingBar() {
  return (
    <div className="w-full bg-gray-700 h-1 rounded overflow-hidden">
      <div 
        className="h-full bg-blue-500 animate-[loading_2s_ease-in-out_infinite]"
      ></div>
    </div>
  );
}

export default LoadingBar;
