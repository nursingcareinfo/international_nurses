import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ApplicationsTracker from "./components/ApplicationsTracker";
import Benefits from "./components/Benefits";
import Countries from "./components/Countries";
import Footer from "./components/Footer";
import Survey from "./components/Survey";

function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Countries />
      <ApplicationsTracker />
      <Benefits />
      <Footer />
    </>
  );
}


export default function App() {
  // Dynamically determine basename so it works across all deployments:
  // - AI Studio dev container: /
  // - Express server production: /jobs_for_nurses
  // - GitHub Pages: /international_nurses
  const basename = window.location.pathname.includes("/jobs_for_nurses")
    ? "/jobs_for_nurses"
    : window.location.pathname.includes("/international_nurses")
    ? "/international_nurses"
    : "/";

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/survey" element={<Survey />} />
        {/* Fallback route to redirect to home */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
