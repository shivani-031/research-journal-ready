import { useState } from "react";

import {
  User,
  Mail,
  CalendarDays,
  ShieldCheck,
  Clock,
  KeyRound,
  Save,
  LogOut,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function AccountPage({ user }) {
  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name || ""
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const email = user?.email || "Not available";

  const provider =
    user?.app_metadata?.provider || "email";

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleString()
    : "Not available";

  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString()
    : "Not available";

  const emailConfirmed =
    user?.email_confirmed_at ||
    user?.confirmed_at;

  const displayName =
    user?.user_metadata?.full_name ||
    email.split("@")[0] ||
    "Researcher";

  const initial =
    displayName.charAt(0).toUpperCase();

  // =========================================================
  // UPDATE PROFILE
  // =========================================================

  const updateProfile = async () => {
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      setMessage("");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const {
        data,
        error: updateError,
      } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
        },
      });

      if (updateError) {
        throw updateError;
      }

      setFullName(
        data.user?.user_metadata?.full_name ||
          fullName.trim()
      );

      setMessage(
        "Profile updated successfully."
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // PASSWORD RESET
  // =========================================================

  const sendPasswordReset = async () => {
    setMessage("");
    setError("");

    try {
      const {
        error: resetError,
      } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              window.location.origin,
          }
        );

      if (resetError) {
        throw resetError;
      }

      setMessage(
        "Password reset email sent. Check your inbox."
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not send password reset email."
      );
    }
  };

  // =========================================================
  // SIGN OUT
  // =========================================================

  const signOut = async () => {
    setError("");

    const {
      error: signOutError,
    } = await supabase.auth.signOut();

    if (signOutError) {
      setError(
        signOutError.message
      );
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50 px-6 md:px-10 lg:px-14 py-10">

      <div className="max-w-5xl mx-auto">

        {/* HEADER */}

        <div>
          <p className="text-blue-600 font-bold text-sm tracking-wide">
            ACCOUNT SETTINGS
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">
            My Account
          </h1>

          <p className="text-slate-500 mt-2">
            View and manage your ResearchReady AI account.
          </p>
        </div>

        {/* PROFILE HEADER */}

        <div className="bg-white border border-slate-200 rounded-3xl p-7 md:p-9 mt-8">

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">

            <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold">
              {initial}
            </div>

            <div>

              <h2 className="text-2xl font-bold text-slate-900">
                {displayName}
              </h2>

              <p className="text-slate-500 mt-1">
                {email}
              </p>

              <div
                className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-sm font-semibold ${
                  emailConfirmed
                    ? "bg-green-50 text-green-700"
                    : "bg-orange-50 text-orange-700"
                }`}
              >
                <ShieldCheck size={16} />

                {emailConfirmed
                  ? "Email Verified"
                  : "Email Not Verified"}
              </div>

            </div>

          </div>

        </div>

        {/* ACCOUNT DETAILS */}

        <div className="grid md:grid-cols-2 gap-6 mt-6">

          <AccountDetail
            icon={Mail}
            label="Email Address"
            value={email}
          />

          <AccountDetail
            icon={ShieldCheck}
            label="Login Provider"
            value={provider}
          />

          <AccountDetail
            icon={CalendarDays}
            label="Account Created"
            value={createdAt}
          />

          <AccountDetail
            icon={Clock}
            label="Last Sign In"
            value={lastSignIn}
          />

        </div>

        {/* EDIT PROFILE */}

        <div className="bg-white border border-slate-200 rounded-3xl p-7 md:p-9 mt-6">

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User size={21} />
            </div>

            <div>

              <h2 className="text-xl font-bold">
                Profile Information
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Update your ResearchReady display name.
              </p>

            </div>

          </div>

          <div className="mt-6">

            <label className="block text-sm font-semibold text-slate-700">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) =>
                setFullName(
                  event.target.value
                )
              }
              placeholder="Enter your full name"
              className="w-full mt-2 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mt-5">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mt-5">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={updateProfile}
            disabled={saving}
            className={`mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
              saving
                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <Save size={18} />

            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>

        </div>

        {/* SECURITY */}

        <div className="bg-white border border-slate-200 rounded-3xl p-7 md:p-9 mt-6">

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <KeyRound size={21} />
            </div>

            <div>

              <h2 className="text-xl font-bold">
                Security
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Manage your account password.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={sendPasswordReset}
            className="mt-6 border border-slate-300 px-6 py-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Send Password Reset Email
          </button>

        </div>

        {/* ACCOUNT ID */}

        <div className="bg-white border border-slate-200 rounded-3xl p-7 md:p-9 mt-6">

          <p className="text-sm text-slate-500">
            Account ID
          </p>

          <p className="font-mono text-sm text-slate-700 break-all mt-2">
            {user?.id || "Not available"}
          </p>

        </div>

        {/* SIGN OUT */}

        <div className="bg-white border border-red-100 rounded-3xl p-7 md:p-9 mt-6">

          <h2 className="text-xl font-bold text-slate-900">
            Sign Out
          </h2>

          <p className="text-slate-500 mt-2">
            Sign out of your ResearchReady AI account.
          </p>

          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 mt-5 bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-xl font-semibold hover:bg-red-100 transition"
          >
            <LogOut size={18} />
            Sign Out
          </button>

        </div>

      </div>

    </div>
  );
}


function AccountDetail({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">

      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
        <Icon size={19} />
      </div>

      <p className="text-sm text-slate-500 mt-4">
        {label}
      </p>

      <p className="font-semibold text-slate-900 mt-1 break-words">
        {value}
      </p>

    </div>
  );
}

export default AccountPage;