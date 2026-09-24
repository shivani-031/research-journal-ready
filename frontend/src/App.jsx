import {
  useEffect,
  useState,
} from "react";

import { supabase } from "./lib/supabase";

import AuthPage from "./components/AuthPage";
import Sidebar from "./components/Sidebar";
import LibraryPage from "./components/LibraryPage";
import ChatPage from "./components/ChatPage";
import AccountPage from "./components/AccountPage";

import ResearchWorkspace from "./ResearchWorkspace";


function App() {
  // =========================================================
  // AUTH
  // =========================================================

  const [session, setSession] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);


  // =========================================================
  // NAVIGATION
  // =========================================================

  const [activePage, setActivePage] =
    useState("dashboard");


  // =========================================================
  // WORKSPACE
  // =========================================================

  const [
    initialAnalysis,
    setInitialAnalysis,
  ] = useState(null);

  const [
    workspaceKey,
    setWorkspaceKey,
  ] = useState(0);


  // =========================================================
  // LOAD SESSION
  // =========================================================

  useEffect(() => {
    const loadSession = async () => {
      try {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          console.error(
            "Session error:",
            error
          );
        }

        setSession(
          data?.session ?? null
        );
      } catch (error) {
        console.error(
          "Supabase error:",
          error
        );

        setSession(null);
      } finally {
        setAuthLoading(false);
      }
    };

    loadSession();


    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          nextSession
        ) => {
          setSession(nextSession);

          setAuthLoading(false);

          if (!nextSession) {
            setActivePage(
              "dashboard"
            );

            setInitialAnalysis(
              null
            );
          }
        }
      );


    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);


  // =========================================================
  // SAVE ANALYSIS
  // =========================================================

  const saveAnalysisToLibrary =
    async (analysis) => {
      const user =
        session?.user;

      if (!user) {
        return;
      }

      try {
        const {
          error,
        } =
          await supabase
            .from("manuscripts")
            .insert({
              user_id:
                user.id,

              file_name:
                analysis.file
                  ?.filename ||
                "Untitled Manuscript",

              file_type:
                analysis.file
                  ?.file_type ||
                null,

              readiness_score:
                analysis.readiness
                  ?.score ??
                null,

              analysis_result:
                analysis,
            });

        if (error) {
          throw error;
        }

        console.log(
          "Analysis saved to Library."
        );
      } catch (error) {
        console.error(
          "Library save error:",
          error
        );
      }
    };


  // =========================================================
  // OPEN ANALYSIS FROM LIBRARY
  // =========================================================

  const openLibraryAnalysis =
    (analysisResult) => {
      setInitialAnalysis(
        analysisResult
      );

      setWorkspaceKey(
        (current) =>
          current + 1
      );

      setActivePage(
        "dashboard"
      );

      window.scrollTo(
        0,
        0
      );
    };


  // =========================================================
  // NEW ANALYSIS
  // =========================================================

  const startNewAnalysis =
    () => {
      console.log(
        "NEW ANALYSIS CLICKED"
      );

      // Remove previous paper
      setInitialAnalysis(
        null
      );

      // Force completely fresh workspace
      setWorkspaceKey(
        (current) =>
          current + 1
      );

      // IMPORTANT:
      // Dedicated page for upload
      setActivePage(
        "new-analysis"
      );

      window.scrollTo(
        0,
        0
      );
    };


  // =========================================================
  // SIDEBAR NAVIGATION
  // =========================================================

  const handleNavigation =
    (page) => {
      console.log(
        "Navigating to:",
        page
      );

      // Dashboard = homepage
      if (page === "dashboard") {
        setInitialAnalysis(null);

        setWorkspaceKey(
          (current) =>
            current + 1
        );
      }

      setActivePage(page);

      window.scrollTo(
        0,
        0
      );
    };


  // =========================================================
  // AUTH LOADING
  // =========================================================

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">

        <div className="text-center">

          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto" />

          <p className="text-slate-500 mt-4">
            Loading ResearchReady AI...
          </p>

        </div>

      </div>
    );
  }


  // =========================================================
  // NOT LOGGED IN
  // =========================================================

  if (!session) {
    return (
      <AuthPage />
    );
  }


  const user =
    session.user;


  // =========================================================
  // APPLICATION
  // =========================================================

  return (
    <div className="min-h-screen bg-white">

      {/* SIDEBAR */}

      <Sidebar
        user={user}
        activePage={activePage}
        onNavigate={
          handleNavigation
        }
        onNewAnalysis={
          startNewAnalysis
        }
      />


      {/* MAIN CONTENT */}

      <main className="md:ml-64 min-h-screen">


        {/* ===================================================
            DASHBOARD
            Homepage OR saved analysis result
        =================================================== */}

        {activePage ===
          "dashboard" && (

          <ResearchWorkspace
            key={`dashboard-${workspaceKey}`}
            initialAnalysisResult={
              initialAnalysis
            }
            initialPage="home"
            onAnalysisComplete={
              saveAnalysisToLibrary
            }
          />

        )}


        {/* ===================================================
            NEW ANALYSIS
            DIRECTLY OPENS UPLOAD PAGE
        =================================================== */}

        {activePage ===
          "new-analysis" && (

          <ResearchWorkspace
            key={`new-${workspaceKey}`}
            initialAnalysisResult={
              null
            }
            initialPage="upload"
            onAnalysisComplete={
              saveAnalysisToLibrary
            }
          />

        )}


        {/* ===================================================
            LIBRARY
        =================================================== */}

        {activePage ===
          "library" && (

          <LibraryPage
            user={user}
            onOpenAnalysis={
              openLibraryAnalysis
            }
            onNewAnalysis={
              startNewAnalysis
            }
          />

        )}


        {/* ===================================================
            AI CHAT
        =================================================== */}

        {activePage ===
          "chat" && (

          <ChatPage
            user={user}
          />

        )}


        {/* ===================================================
            ACCOUNT
        =================================================== */}

        {activePage ===
          "account" && (

          <AccountPage
            user={user}
          />

        )}

      </main>

    </div>
  );
}

export default App;