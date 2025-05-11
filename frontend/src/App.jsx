import VideoDisplay from "./pages/VideoDisplay";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { JobProvider } from "./context/JobContext";
import "./App.css";

function App() {
  return (
    <JobProvider>
      <Router>
        <Routes>
          <Route path="/" element={<VideoDisplay />} />
        </Routes>
      </Router>
    </JobProvider>
  );
}

export default App;
