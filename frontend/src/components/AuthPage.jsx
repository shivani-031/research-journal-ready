import { useState } from "react";

import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  BookOpen,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

import { supabase } from "../lib/supabase";


function AuthPage() {
  // =========================================================
  // STATE
  // =========================================================

  const [mode, setMode] =
    useState("login");

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");


  // =========================================================
  // SWITCH LOGIN / SIGNUP
  // =========================================================

  const changeMode = (newMode) => {
    setMode(newMode);

    setError("");
    setMessage("");

    setPassword("");
    setConfirmPassword("");
  };


  // =========================================================
  // EMAIL LOGIN
  // =========================================================

  const handleLogin = async () => {
    if (!email.trim()) {
      setError(
        "Please enter your email address."
      );

      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );

      return;
    }

    setLoading(true);

    setError("");
    setMessage("");

    try {
      const {
        error: loginError,
      } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw loginError;
      }

    } catch (err) {
      console.error(
        "Login error:",
        err
      );

      if (
        err.message
          ?.toLowerCase()
          .includes(
            "email not confirmed"
          )
      ) {
        setError(
          "Please confirm your email first. Check your inbox for the confirmation link."
        );
      } else if (
        err.message
          ?.toLowerCase()
          .includes(
            "invalid login credentials"
          )
      ) {
        setError(
          "Invalid email or password."
        );
      } else {
        setError(
          err.message ||
            "Could not sign in."
        );
      }
    } finally {
      setLoading(false);
    }
  };


  // =========================================================
  // EMAIL SIGNUP
  // =========================================================

  const handleSignup = async () => {
    if (!fullName.trim()) {
      setError(
        "Please enter your full name."
      );

      return;
    }

    if (!email.trim()) {
      setError(
        "Please enter your email address."
      );

      return;
    }

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );

      return;
    }

    if (
      password !== confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    setLoading(true);

    setError("");
    setMessage("");

    try {
      const {
        data,
        error: signupError,
      } =
        await supabase.auth.signUp({
          email: email.trim(),

          password,

          options: {
            data: {
              full_name:
                fullName.trim(),
            },

            emailRedirectTo:
              window.location.origin,
          },
        });

      if (signupError) {
        throw signupError;
      }

      if (!data.session) {
        setMessage(
          "Account created successfully! Please check your email and confirm your account before logging in."
        );

        setPassword("");
        setConfirmPassword("");

        return;
      }

    } catch (err) {
      console.error(
        "Signup error:",
        err
      );

      setError(
        err.message ||
          "Could not create your account."
      );
    } finally {
      setLoading(false);
    }
  };


  // =========================================================
  // GOOGLE LOGIN
  // =========================================================

  const handleGoogleLogin =
    async () => {
      setGoogleLoading(true);

      setError("");
      setMessage("");

      try {
        const {
          error: googleError,
        } =
          await supabase.auth.signInWithOAuth({
            provider: "google",

            options: {
              redirectTo:
                window.location.origin,
            },
          });

        if (googleError) {
          throw googleError;
        }

      } catch (err) {
        console.error(
          "Google login error:",
          err
        );

        setError(
          err.message ||
            "Could not continue with Google."
        );

        setGoogleLoading(false);
      }
    };


  // =========================================================
  // FORM SUBMIT
  // =========================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (mode === "login") {
      await handleLogin();
    } else {
      await handleSignup();
    }
  };


  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-white flex">

      {/* LEFT SIDE */}

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">

        <div className="absolute w-96 h-96 bg-white/10 rounded-full -top-32 -left-20" />

        <div className="absolute w-80 h-80 bg-white/10 rounded-full -bottom-24 -right-20" />

        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-lg">
              <BookOpen size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                ResearchReady AI
              </h1>

              <p className="text-blue-100 text-sm">
                Academic Research Assistant
              </p>
            </div>

          </div>


          <div className="max-w-xl">

            <p className="text-blue-100 font-semibold tracking-wide text-sm">
              RESEARCH SMARTER
            </p>

            <h2 className="text-5xl xl:text-6xl font-bold leading-tight mt-5">
              Prepare your research for{" "}
              <span className="text-blue-200">
                journal submission.
              </span>
            </h2>

            <p className="text-lg text-blue-100 leading-8 mt-7">
              Analyze manuscript quality,
              verify scholarly references,
              discover relevant journals and
              generate professional readiness
              reports.
            </p>


            <div className="space-y-4 mt-10">

              <FeatureText text="AI-powered manuscript analysis" />

              <FeatureText text="Reference verification with scholarly metadata" />

              <FeatureText text="Relevant journal discovery" />

              <FeatureText text="Personal research library" />

              <FeatureText text="AI Research Chat" />

            </div>

          </div>


          <p className="text-blue-200 text-sm">
            ResearchReady AI • Research
            support before submission
          </p>

        </div>

      </div>


      {/* RIGHT SIDE */}

      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 md:px-12">

        <div className="w-full max-w-md">

          {/* MOBILE LOGO */}

          <div className="lg:hidden flex items-center gap-3 mb-10">

            <div className="w-11 h-11 bg-blue-600 rounded-xl text-white flex items-center justify-center">
              <BookOpen size={22} />
            </div>

            <div>

              <p className="font-bold text-xl text-slate-900">
                ResearchReady AI
              </p>

              <p className="text-xs text-blue-600">
                Academic Research Assistant
              </p>

            </div>

          </div>


          {/* TITLE */}

          <div>

            <p className="text-blue-600 font-bold text-sm tracking-wide">
              {mode === "login"
                ? "WELCOME BACK"
                : "CREATE ACCOUNT"}
            </p>

            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">
              {mode === "login"
                ? "Sign in to your account"
                : "Start your research journey"}
            </h2>

            <p className="text-slate-500 mt-3">
              {mode === "login"
                ? "Continue working on your manuscripts and research."
                : "Create an account to save and manage your research analyses."}
            </p>

          </div>


          {/* GOOGLE BUTTON */}

          <button
            type="button"
            onClick={
              handleGoogleLogin
            }
            disabled={
              googleLoading ||
              loading
            }
            className={`w-full flex items-center justify-center gap-3 border border-slate-300 rounded-xl py-3.5 mt-8 font-semibold transition ${
              googleLoading
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
            }`}
          >

            <svg
              width="21"
              height="21"
              viewBox="0 0 48 48"
            >
              <path
                fill="#FFC107"
                d="M43.6 20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11.6 0 19.3-8.1 19.3-19.5 0-1.3-.1-2.3-.3-3.5z"
              />

              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"
              />

              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.8-1.7 13.3-4.7l-6.1-5.2C29.2 35.5 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.4 39.5 16.1 44 24 44z"
              />

              <path
                fill="#1976D2"
                d="M43.6 20H24v8h11.3c-.8 2.4-2.3 4.5-4.2 6.1l6.1 5.2C40.9 35.9 43.6 30.8 43.6 24c0-1.3-.1-2.3-.3-4z"
              />
            </svg>

            {googleLoading
              ? "Connecting to Google..."
              : "Continue with Google"}

          </button>


          {/* DIVIDER */}

          <div className="flex items-center gap-4 my-7">

            <div className="flex-1 h-px bg-slate-200" />

            <span className="text-xs font-semibold text-slate-400">
              OR CONTINUE WITH EMAIL
            </span>

            <div className="flex-1 h-px bg-slate-200" />

          </div>


          {/* FORM */}

          <form
            onSubmit={
              handleSubmit
            }
          >

            {mode === "signup" && (

              <div className="mb-5">

                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name
                </label>

                <div className="relative">

                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={
                      fullName
                    }
                    onChange={(
                      event
                    ) =>
                      setFullName(
                        event.target.value
                      )
                    }
                    placeholder="Enter your full name"
                    className="w-full border border-slate-300 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />

                </div>

              </div>

            )}


            <div className="mb-5">

              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>

              <div className="relative">

                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full border border-slate-300 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />

              </div>

            </div>


            <div className="mb-5">

              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>

              <div className="relative">

                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    password
                  }
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  className="w-full border border-slate-300 rounded-xl pl-12 pr-12 py-3.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >

                  {showPassword ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}

                </button>

              </div>

            </div>


            {mode === "signup" && (

              <div className="mb-5">

                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Confirm Password
                </label>

                <div className="relative">

                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      confirmPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="w-full border border-slate-300 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />

                </div>

              </div>

            )}


            {message && (

              <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-5">

                <CheckCircle2
                  size={20}
                  className="shrink-0 mt-0.5"
                />

                <p className="text-sm leading-6">
                  {message}
                </p>

              </div>

            )}


            {error && (

              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5">

                <p className="text-sm leading-6">
                  {error}
                </p>

              </div>

            )}


            <button
              type="submit"
              disabled={
                loading ||
                googleLoading
              }
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition ${
                loading
                  ? "bg-blue-300 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              }`}
            >

              {loading
                ? mode === "login"
                  ? "Signing In..."
                  : "Creating Account..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}

              {!loading && (
                <ArrowRight
                  size={18}
                />
              )}

            </button>

          </form>


          {/* SWITCH */}

          <div className="text-center mt-7">

            {mode === "login" ? (

              <p className="text-slate-500">

                Don't have an account?{" "}

                <button
                  type="button"
                  onClick={() =>
                    changeMode(
                      "signup"
                    )
                  }
                  className="text-blue-600 font-bold hover:text-blue-700"
                >
                  Create Account
                </button>

              </p>

            ) : (

              <p className="text-slate-500">

                Already have an account?{" "}

                <button
                  type="button"
                  onClick={() =>
                    changeMode(
                      "login"
                    )
                  }
                  className="text-blue-600 font-bold hover:text-blue-700"
                >
                  Sign In
                </button>

              </p>

            )}

          </div>


          <p className="text-xs text-center text-slate-400 leading-5 mt-8">

            By continuing, you agree to use
            ResearchReady AI as a research
            assistance tool. Journal readiness
            scores do not guarantee publication
            or acceptance.

          </p>

        </div>

      </div>

    </div>
  );
}


// =========================================================
// LEFT FEATURE
// =========================================================

function FeatureText({
  text,
}) {
  return (
    <div className="flex items-center gap-3">

      <div className="w-6 h-6 shrink-0 bg-white/15 rounded-full flex items-center justify-center">

        <CheckCircle2
          size={15}
        />

      </div>

      <p className="text-blue-50">
        {text}
      </p>

    </div>
  );
}


export default AuthPage;