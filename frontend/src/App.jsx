import VideoDisplay from "./pages/VideoDisplay";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VideoDisplay />} />
      </Routes>
    </Router>
  );
}

export default App;
