// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import callGeminiAPI from "./ApiCalls";
import TypingIndicator from "./TypingIndicator";
import {
  MenuIcon,
  XIcon,
  TrashIcon,
  EditIcon,
  DownloadIcon,
  SendIcon,
  RepeatIcon,
  ZapIcon,
} from "./Icon";

import {loadState,saveState, formatTimestamp} from "./Funtions"

const getNewSessionId = () => crypto.randomUUID();

const App = () => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const initialState = loadState() || {
    sessions: {},
    currentSessionId: null,
  };

  const initialSessionKeys = Object.keys(initialState.sessions);
  if (initialSessionKeys.length === 0) {
    const newId = getNewSessionId();
    initialState.sessions[newId] = {
      id: newId,
      title: "New Chat 1",
      messages: [],
      createdAt: new Date().toISOString(),
      isTyping: false,
      error: null,
    };
    initialState.currentSessionId = newId;
  } else if (
    !initialState.currentSessionId ||
    !initialState.sessions[initialState.currentSessionId]
  ) {
    initialState.currentSessionId = initialSessionKeys[0];
  }

  const [sessions, setSessions] = useState(initialState.sessions);
  const [currentSessionId, setCurrentSessionId] = useState(
    initialState.currentSessionId
  );
  const [inputMessage, setInputMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");

  const currentSession = sessions[currentSessionId];
  const sessionMessages = currentSession?.messages || [];
  const isTyping = currentSession?.isTyping || false;

  useEffect(() => {
    saveState({ sessions, currentSessionId });
  }, [sessions, currentSessionId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [sessionMessages.length, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentSessionId]);

  const handleNewChat = useCallback(() => {
    const newId = getNewSessionId();
    const chatCount = Object.keys(sessions).length + 1;
    setSessions((prev: any) => ({
      ...prev,
      [newId]: {
        id: newId,
        title: `New Chat ${chatCount}`,
        messages: [],
        createdAt: new Date().toISOString(),
        isTyping: false,
        error: null,
      },
    }));
    setCurrentSessionId(newId);
    setIsSidebarOpen(false);
  }, [sessions]);

  const handleSwitchChat = useCallback((id: any) => {
    setCurrentSessionId(id);
    setIsSidebarOpen(false);
  }, []);

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isTyping) return;

      const newId = getNewSessionId();
      const userMessage = {
        id: newId,
        role: "user",
        text: messageText,
        timestamp: new Date().toISOString(),
      };

      setSessions((prev: any) => {
        const newSessions = { ...prev };
        newSessions[currentSessionId] = {
          ...newSessions[currentSessionId],
          messages: [...newSessions[currentSessionId].messages, userMessage],
        };

        newSessions[currentSessionId].error = null;
        return newSessions;
      });
      setInputMessage("");

      await callGeminiAPI(
        [...sessionMessages, userMessage],
        setSessions,
        currentSessionId
      );
    },
    [currentSessionId, sessionMessages, isTyping]
  );

  const handleRetryMessage = useCallback(async () => {
    if (isTyping || !currentSession?.error) return;

    const lastUserMessage = currentSession.messages.find(
      (m: any) => m.id === currentSession.error
    );
    if (!lastUserMessage) return;

    setSessions((prev: any) => {
      const newSessions = { ...prev };
      newSessions[currentSessionId].error = null;
      return newSessions;
    });

    await callGeminiAPI(currentSession.messages, setSessions, currentSessionId);
  }, [currentSessionId, currentSession, isTyping]);

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputMessage);
    }
  };

  const handleDownloadChat = useCallback(() => {
    if (!currentSession) return;

    const sessionData = {
      id: currentSession.id,
      title: currentSession.title,
      createdAt: currentSession.createdAt,
      messages: currentSession.messages,
    };

    const jsonString = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentSession.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentSession]);

  const startRename = (id: any) => {
    const session = sessions[id];
    if (session) {
      setTempTitle(session.title);
      setIsRenaming(id);
    }
  };

  const commitRename = useCallback(() => {
    if (!isRenaming || !tempTitle.trim()) return;

    setSessions((prev: Record<string, Session>) => {
      const newSessions = { ...prev };
      newSessions[isRenaming].title = tempTitle.trim();
      return newSessions;
    });

    setIsRenaming(null);
    setTempTitle("");
  }, [isRenaming, tempTitle]);

  const handleRenameKeyDown = (e: any) => {
    if (e.key === "Enter") {
      commitRename();
    } else if (e.key === "Escape") {
      setIsRenaming(null);
      setTempTitle("");
    }
  };

  const handleDeleteChat = useCallback(
    (id: any) => {
      if (!window.confirm("Are you sure you want to delete this chat session?"))
        return;

      setSessions((prev: any) => {
        const newSessions = { ...prev };
        delete newSessions[id];

        const sessionKeys = Object.keys(newSessions);

        if (id === currentSessionId) {
          if (sessionKeys.length > 0) {
            setCurrentSessionId(sessionKeys[0]);
          } else {
            handleNewChat();
            return sessions;
          }
        }
        return newSessions;
      });
    },
    [currentSessionId, handleNewChat, sessions]
  );

  interface Session {
    id: string;
    title: string;
    createdAt: string | number | Date;
  }

  const SessionItem = ({ session }: { session: Session }) => {
    const isActive = session.id === currentSessionId;

    return (
      <div
        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
          isActive
            ? "bg-indigo-600 text-white shadow-lg"
            : "text-gray-200 hover:bg-gray-700"
        }`}
      >
        {isRenaming === session.id ? (
          <input
            type="text"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleRenameKeyDown}
            className="grow bg-gray-600 text-white rounded-lg px-2 py-1 mr-2 focus:outline-none focus:ring-2 ring-indigo-400"
            autoFocus
          />
        ) : (
          <span
            onClick={() => handleSwitchChat(session.id)}
            className="grow truncate pr-2 text-sm"
          >
            {session.title}
          </span>
        )}
        <div className="flex space-x-1">
          {isRenaming !== session.id && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startRename(session.id);
                }}
                className="p-1 rounded-full hover:bg-indigo-500/50"
                title="Rename Chat"
              >
                <EditIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChat(session.id);
                }}
                className="p-1 rounded-full hover:bg-red-500/50"
                title="Delete Chat"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const ChatMessage = ({
    message,
    isFailed,
  }: {
    message: any;
    isFailed: any;
  }) => {
    const isUser = message.role === "user";

    return (
      <div className={`flex mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-4/5 md:max-w-3/5 lg:max-w-2/3 p-3 rounded-2xl shadow-md ${
            isUser
              ? "bg-indigo-500 text-white rounded-br-none"
              : "bg-white text-gray-800 rounded-tl-none dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
          } ${
            isFailed
              ? "border-2 border-red-500 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              : ""
          }`}
        >
          {message.text}
          {isFailed && (
            <div className="text-xs text-red-600 dark:text-red-300 mt-2 font-semibold">
              Failed to get response.
            </div>
          )}
          <div
            className={`text-xs mt-1 ${
              isUser ? "text-indigo-200" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
    );
  };

  const sortedSessions = useMemo(() => {
    return Object.values(sessions).sort(
      (a, b) =>
        new Date((b as any).createdAt).getTime() -
        new Date((a as any).createdAt).getTime()
    );
  }, [sessions]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 font-sans antialiased">
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 dark:bg-gray-950 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-700/50">
            <h1 className="text-xl font-bold text-white flex items-center">
              <ZapIcon className="w-6 h-6 mr-2 text-indigo-400" />
              Grace AI
            </h1>
            <button
              className="lg:hidden p-2 rounded-full hover:bg-gray-700 text-white"
              onClick={() => setIsSidebarOpen(false)}
              title="Close Menu"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          <button
            onClick={handleNewChat}
            className="w-full mt-4 flex items-center justify-center p-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition duration-150 shadow-md hover:shadow-lg"
          >
            + Start New Chat
          </button>

          <div className="grow mt-4 overflow-y-auto space-y-2">
            {sortedSessions.map((session: any) => (
              <SessionItem key={session.id} session={session} />
            ))}
          </div>

          {currentSession && (
            <div className="pt-4 border-t border-gray-700/50">
              <button
                onClick={handleDownloadChat}
                className="w-full flex items-center justify-center p-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition duration-150"
                title="Download Chat History as JSON"
              >
                <DownloadIcon className="w-5 h-5 mr-2" />
                Export Current Chat
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className={`flex flex-col flex-1 lg:ml-64 transition-all duration-300`}
      >
        <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
          <button
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-white"
            onClick={() => setIsSidebarOpen(true)}
            title="Open Menu"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold truncate px-2">
            {currentSession?.title || "Gemini Chat"}
          </h2>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {sessionMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-600">
              <ZapIcon className="w-16 h-16 mb-4 text-indigo-400/50" />
              <p className="text-xl font-medium">
                Start a conversation with the Gemini Assistant.
              </p>
              <p className="text-sm mt-2">
                Try asking for a recipe, a code snippet, or a fun fact.
              </p>
            </div>
          ) : (
            sessionMessages.map((msg: any) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isFailed={currentSession.error === msg.id}
              />
            ))
          )}

          {isTyping && <TypingIndicator />}

          <div ref={chatEndRef} />
        </div>

        <div className="p-4 md:p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {currentSession?.error && (
            <div className="flex justify-center mb-3">
              <button
                onClick={handleRetryMessage}
                disabled={isTyping}
                className="flex items-center p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition duration-150 disabled:opacity-50"
              >
                <RepeatIcon className="w-5 h-5 mr-2" />
                Retry Last Message
              </button>
            </div>
          )}
          <div className="flex items-end max-w-4xl mx-auto bg-gray-100 dark:bg-gray-700 rounded-xl shadow-lg border border-gray-300 dark:border-gray-600">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              rows={1}
              placeholder="Message Gemini (Enter to send, Shift+Enter for new line)"
              className="grow p-4 bg-transparent resize-none focus:outline-none text-base disabled:text-gray-400"
              style={{ minHeight: "3rem", maxHeight: "10rem" }}
            />
            <button
              onClick={() => handleSendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isTyping}
              className={`p-3 m-2 rounded-xl transition-all duration-200 ${
                inputMessage.trim() && !isTyping
                  ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg"
                  : "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
              }`}
              title="Send Message"
            >
              <SendIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default App;
export { getNewSessionId };
