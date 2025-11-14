const LOCAL_STORAGE_KEY = "chat-sessions";

const loadState = () => {
  try {
    const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serializedState === null) return null;
    else {
      console.log(serializedState);
      return JSON.parse(serializedState);
    }
  } catch (e) {
    console.error("Could not load state from localStorage", e);
    return null;
  }
};

const saveState = (state: any) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
  } catch (e) {
    console.error("Could not save state to localStorage", e);
  }
};



const formatTimestamp = (date: any) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  

export {loadState,saveState, formatTimestamp}