import React, { useState } from "react";
import "./App.css";
import BookIntro from "./components/BookIntro";
import Dashboard from "./components/Dashboard";

function App() {
  const [entered, setEntered] = useState(false);
  const [authData, setAuthData] = useState(null); // { token, user }

  const handleEnter = (data) => {
    setAuthData(data);
    setEntered(true);
  };

  const handleLogout = () => {
    setAuthData(null);
    setEntered(false);
  };

  if (!entered) {
    return <BookIntro onEnter={handleEnter} />;
  }

  return <Dashboard authData={authData} onLogout={handleLogout} />;
}

export default App;
