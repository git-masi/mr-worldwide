import { Routes, Route } from "react-router";
import Booking from "./pages/Booking";
import Layout from "./Layout";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/booking" element={<Booking />} />
      </Route>
    </Routes>
  );
}

export default App;
