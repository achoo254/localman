import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppLayout } from "./components/layout/app-layout";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <AppLayout>
      <div className="container">
        <h1>Welcome to Tauri + React</h1>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            greet();
          }}
        >
          <input
            id="greet-input"
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Enter a name..."
          />
          <button type="submit">Greet</button>
        </form>
        <p>{greetMsg}</p>
      </div>
    </AppLayout>
  );
}

export default App;
