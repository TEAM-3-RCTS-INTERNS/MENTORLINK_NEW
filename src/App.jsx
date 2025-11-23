import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth, ProfileRedirect } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";

import Landing from "./pages/Landing";
import ContactPage from "./pages/contactpage";
import Login from "./pages/Login";
import EmailOtp from "./pages/EmailOtp";
import Signup from "./pages/Signup";
import StudentForm from "./pages/StudentForm";
import MentorForm from "./pages/MentorForm";
import EventOrganizer from "./pages/EventOrganizer";
import HomePage from "./pages/HomePage";
import StudentProfile from "./pages/StudentProfile";
import OrganizerProfile from "./pages/OrganizerProfile";
import MentorProfile from "./pages/MentorProfile";
import Events from "./pages/Events";
import Mentors from "./pages/Mentors";
import Students from "./pages/Students";
import Settings from "./pages/Settings";
import HostEventForm from "./pages/HostEventForm";
import EventInfo from "./pages/EventInfo";
import RequestReview from "./pages/RequestReview";
import MentorBriefProfile from "./pages/MentorBriefProfile";
import ConnectionRequestView from "./pages/ConnectionRequestView";
import Messages from "./pages/Messages";
import AdminDashboard from "./pages/AdminDashboard";

function AppContent() {
  const location = useLocation();
  const { loading } = useAuth();

  // Pages that should NOT show the default navbar
  const isLoginPage = location.pathname === "/login";
  const isSignupPage = location.pathname === "/signup";
  const isOtpPage = location.pathname === "/otp";
  const isFormPage = [
    "/student-form",
    "/mentor-form",
    "/event-organizer"
  ].includes(location.pathname);
  const isAppPage = [
    "/home",
    "/student-profile",
    "/organizer-profile",
    "/mentor-profile",
    "/events",
    "/mentors",
    "/settings",
    "/host-an-event",
    "/admin"
  ].includes(location.pathname) || location.pathname.startsWith("/messages");

  if (loading) return <div>Loading...</div>;

  return (
    <>
      {!isLoginPage && !isSignupPage && !isOtpPage && !isFormPage && !isAppPage && <Navbar />}

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/otp" element={<EmailOtp />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/student-form" element={<StudentForm />} />
        <Route path="/mentor-form" element={<MentorForm />} />
        <Route path="/event-organizer" element={<EventOrganizer />} />

        {/* Host Event Form */}
        <Route path="/host-an-event" element={<HostEventForm />} />

        {/* Event Info Page */}
        <Route path="/events/:eventId" element={<EventInfo />} />

        {/* Profile Redirect */}
        <Route path="/profile" element={<ProfileRedirect />} />

        {/* Protected App Routes */}
        <Route path="/home" element={<HomePage />} />

        <Route
          path="/student-profile"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer-profile"
          element={
            <ProtectedRoute requiredRole="organizer">
              <OrganizerProfile key={Date.now()} /> {/* forces remount */}
            </ProtectedRoute>
          }
        />
        <Route
          path="/mentor-profile"
          element={
            <ProtectedRoute requiredRole="mentor">
              <MentorProfile />
            </ProtectedRoute>
          }
        />
        <Route path="/events" element={<Events />} />
        <Route path="/mentors" element={<Mentors />} />
        <Route path="/mentors/:id" element={<MentorBriefProfile />} />
        <Route path="/mentor-profile/:id" element={<MentorProfile />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/:id" element={<StudentProfile />} />
        <Route path="/settings" element={<Settings />} />

        {/* Messages Routes */}
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:userId" element={<Messages />} />

        <Route
          path="/mentor-profile/requests/:requestId"
          element={
            <ProtectedRoute requiredRole="mentor">
              <RequestReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/connection-request/:requestId"
          element={<ConnectionRequestView />}
        />

        {/* Admin Route */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>

      {!isLoginPage && !isAppPage && <Footer />}
    </>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;