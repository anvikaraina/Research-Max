import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import { supabase } from "./lib/supabase";
import { Session } from "@supabase/supabase-js";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Allow a guest mode for previewing if Supabase isn't configured or desired
  useEffect(() => {
    const isGuest = localStorage.getItem('guest_mode') === 'true';
    if (isGuest) {
      setSession({
        access_token: 'guest',
        refresh_token: 'guest',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'guest',
          email: 'guest@example.com',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: { full_name: 'Guest User' },
          aud: 'authenticated',
          role: 'authenticated'
        }
      } as Session);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={session ? <Navigate to="/chat" /> : <LoginPage />} 
        />
        <Route 
          path="/chat/:id?" 
          element={session ? <ChatPage /> : <Navigate to="/" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}
