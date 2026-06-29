import { Routes, Route } from "react-router";
import Booking from "./pages/Booking";

function App() {
  return (
    <Routes>
      <Route path="/booking" element={<Booking />} />
    </Routes>
  );
}

export default App;
