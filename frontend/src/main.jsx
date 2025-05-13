import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/animations.css";
import "./styles/theme.css"; // Make sure this is included
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
