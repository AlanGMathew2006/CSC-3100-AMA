import "./lib/recoveryLink";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth";
import { PasswordRecoveryProvider } from "./passwordRecovery";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PasswordRecoveryProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </PasswordRecoveryProvider>
  </React.StrictMode>,
);
