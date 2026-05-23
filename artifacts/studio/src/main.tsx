import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Send the stored demo token with every API request
setAuthTokenGetter(() => localStorage.getItem("studio_token"));

createRoot(document.getElementById("root")!).render(<App />);
