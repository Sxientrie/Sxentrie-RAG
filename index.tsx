import React from "react";
import { createRoot } from "react-dom/client";
// The application entry point, loading the main App component from the shell.
import { App } from "./src/shell/app";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);