import VideoDisplay from "./components/VideoDisplay";
import "./App.css";

function App() {
  return (
    <>
      <div className="flex flex-col items-center justify-center w-full h-screen text-center">
        <header className="bg-gray-900 text-white w-full h-screen flex flex-col items-center justify-center">
          <h1 className="text-3xl">Video Analytics</h1>
          <VideoDisplay />
        </header>
      </div>
    </>
  );
}

export default App;
