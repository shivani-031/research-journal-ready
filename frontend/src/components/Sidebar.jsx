import { useState } from "react";

import {
  LayoutDashboard,
  Library,
  MessageCircle,
  PlusCircle,
  UserCircle,
  LogOut,
  ChevronUp,
  BookOpen,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function NavItem({
  id,
  label,
  icon: Icon,
  onClick,
  activePage,
  onNavigate,
  setAccountOpen,
}) {
  const active = activePage === id;

  return (
    <button
      type="button"
      onClick={
        onClick ||
        (() => {
          onNavigate(id);
          setAccountOpen(false);
        })
      }
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <Icon size={20} />

      <span>{label}</span>
    </button>
  );
}

function Sidebar({
  user,
  activePage,
  onNavigate,
  onNewAnalysis,
}) {
  const [accountOpen, setAccountOpen] =
    useState(false);

  const email =
    user?.email || "";

  const name =
    user?.user_metadata?.full_name ||
    email.split("@")[0] ||
    "Researcher";

  const initial =
    name.charAt(0).toUpperCase();

  // =========================================================
  // SIGN OUT
  // =========================================================

  const handleSignOut = async () => {
    const {
      error,
    } = await supabase.auth.signOut();

    if (error) {
      console.error(
        "Sign out error:",
        error
      );
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-[70] w-64 bg-white border-r border-slate-200 flex-col">

      {/* LOGO */}

      <div className="px-5 py-6 border-b border-slate-100">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <BookOpen size={21} />
          </div>

          <div>

            <p className="font-bold text-lg text-slate-900">
              ResearchReady
            </p>

            <p className="text-xs text-blue-600 font-semibold">
              AI Research Assistant
            </p>

          </div>

        </div>

      </div>

      {/* NAVIGATION */}

      <div className="flex-1 px-3 py-6 space-y-2">

        <NavItem
          id="dashboard"
          label="Dashboard"
          icon={LayoutDashboard}
          activePage={activePage}
          onNavigate={onNavigate}
          setAccountOpen={setAccountOpen}
        />

        <NavItem
          id="library"
          label="Library"
          icon={Library}
          activePage={activePage}
          onNavigate={onNavigate}
          setAccountOpen={setAccountOpen}
        />

        <NavItem
  id="new-analysis"
  label="New Analysis"
  icon={PlusCircle}
  onClick={() => {
    onNewAnalysis();
    setAccountOpen(false);
  }}
/>

        <NavItem
          id="chat"
          label="AI Research Chat"
          icon={MessageCircle}
          activePage={activePage}
          onNavigate={onNavigate}
          setAccountOpen={setAccountOpen}
        />

      </div>

      {/* ACCOUNT */}

      <div className="relative p-3 border-t border-slate-200">

        {accountOpen && (

          <div className="absolute bottom-[82px] left-3 right-3 bg-white border border-slate-200 rounded-2xl shadow-xl p-2">

            <div className="px-3 py-3 border-b border-slate-100">

              <p className="font-semibold text-slate-900 truncate">
                {name}
              </p>

              <p className="text-xs text-slate-500 truncate mt-1">
                {email}
              </p>

            </div>

            <button
              type="button"
              onClick={() => {
                onNavigate("account");
                setAccountOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 hover:bg-slate-50 text-left"
            >
              <UserCircle size={19} />

              My Account
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 hover:bg-red-50 text-left"
            >
              <LogOut size={19} />

              Sign Out
            </button>

          </div>

        )}

        <button
          type="button"
          onClick={() =>
            setAccountOpen(
              !accountOpen
            )
          }
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition"
        >

          <div className="w-10 h-10 rounded-full bg-green-600 text-white font-bold flex items-center justify-center shrink-0">
            {initial}
          </div>

          <div className="min-w-0 flex-1 text-left">

            <p className="font-semibold text-sm truncate">
              {name}
            </p>

            <p className="text-xs text-slate-500 truncate">
              {email}
            </p>

          </div>

          <ChevronUp
            size={18}
            className={`text-slate-400 transition ${
              accountOpen
                ? "rotate-180"
                : ""
            }`}
          />

        </button>

      </div>

    </aside>
  );
}

export default Sidebar;