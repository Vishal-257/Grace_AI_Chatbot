 const TypingIndicator = () => (
    <div className="flex mb-4 justify-start">
      <div className="bg-gray-200 dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none shadow-md">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300"></div>
        </div>
      </div>
    </div>
  );
export default TypingIndicator;