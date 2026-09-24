import { useEffect, useState, useCallback } from "react";

import {
  FileText,
  Trash2,
  ExternalLink,
  Library,
  Search,
  Plus,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function LibraryPage({
  user,
  onOpenAnalysis,
  onNewAnalysis,
}) {
  const [
    manuscripts,
    setManuscripts,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  // =========================================================
  // LOAD LIBRARY
  // =========================================================

  const loadLibrary = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const {
        data,
        error: libraryError,
      } =
        await supabase
          .from("manuscripts")
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (libraryError) {
        throw libraryError;
      }

      setManuscripts(
        data || []
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not load your Library."
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  // =========================================================
  // LOAD ON PAGE OPEN
  // =========================================================

  useEffect(() => {
    // Call loadLibrary inside an async IIFE to avoid sync setState in effect
    (async () => {
      await loadLibrary();
    })();
  }, [loadLibrary]);

  // =========================================================
  // DELETE
  // =========================================================

  const deleteManuscript =
    async (manuscriptId) => {
      const confirmed =
        window.confirm(
          "Remove this manuscript analysis from your Library?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const {
          error: deleteError,
        } =
          await supabase
            .from("manuscripts")
            .delete()
            .eq(
              "id",
              manuscriptId
            )
            .eq(
              "user_id",
              user.id
            );

        if (deleteError) {
          throw deleteError;
        }

        setManuscripts(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                manuscriptId
            )
        );
      } catch (err) {
        setError(
          err.message ||
            "Could not delete manuscript."
        );
      }
    };

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredManuscripts =
    manuscripts.filter(
      (manuscript) =>
        manuscript.file_name
          ?.toLowerCase()
          .includes(
            search
              .toLowerCase()
              .trim()
          )
    );

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50 px-6 md:px-10 lg:px-14 py-10">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

          <div>

            <p className="text-blue-600 font-bold text-sm tracking-wide">
              YOUR RESEARCH
            </p>

            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">
              My Library
            </h1>

            <p className="text-slate-500 mt-2">
              Access your previously analyzed manuscripts and reports.
            </p>

          </div>

          <button
            type="button"
            onClick={onNewAnalysis}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700"
          >
            <Plus size={19} />

            Analyze New Manuscript
          </button>

        </div>

        {/* SEARCH */}

        <div className="bg-white border border-slate-200 rounded-2xl p-4 mt-8">

          <div className="relative">

            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search manuscripts..."
              className="w-full border border-slate-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

        </div>

        {/* ERROR */}

        {error && (

          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mt-6">
            {error}
          </div>

        )}

        {/* LOADING */}

        {loading && (

          <div className="bg-white border border-slate-200 rounded-3xl p-14 text-center mt-7">

            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto" />

            <p className="text-slate-500 mt-4">
              Loading your Library...
            </p>

          </div>

        )}

        {/* EMPTY */}

        {!loading &&
          filteredManuscripts.length ===
            0 && (

          <div className="bg-white border border-slate-200 rounded-3xl p-14 text-center mt-7">

            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">

              <Library size={30} />

            </div>

            <h2 className="text-2xl font-bold text-slate-900 mt-5">
              Your Library is empty
            </h2>

            <p className="text-slate-500 mt-3">
              Analyze a manuscript and it will automatically appear here.
            </p>

            <button
              type="button"
              onClick={onNewAnalysis}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold mt-6 hover:bg-blue-700"
            >
              Analyze Manuscript
            </button>

          </div>

        )}

        {/* LIBRARY CARDS */}

        {!loading &&
          filteredManuscripts.length >
            0 && (

          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-7">

            {filteredManuscripts.map(
              (manuscript) => {
                const result =
                  manuscript.analysis_result ||
                  {};

                const readiness =
                  result.readiness ||
                  {};

                const references =
                  result.reference_analysis ||
                  {};

                const journals =
                  result.journal_analysis
                    ?.journals ||
                  [];

                return (
                  <div
                    key={manuscript.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition"
                  >

                    <div className="flex justify-between gap-4">

                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                        <FileText
                          size={23}
                        />

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          deleteManuscript(
                            manuscript.id
                          )
                        }
                        className="w-10 h-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2
                          size={18}
                        />
                      </button>

                    </div>

                    <h3 className="font-bold text-lg text-slate-900 mt-5 break-words">
                      {
                        manuscript.file_name
                      }
                    </h3>

                    <p className="text-sm text-slate-500 mt-2">

                      {new Date(
                        manuscript.created_at
                      ).toLocaleDateString(
                        undefined,
                        {
                          year:
                            "numeric",
                          month:
                            "short",
                          day:
                            "numeric",
                        }
                      )}

                    </p>

                    <div className="grid grid-cols-3 gap-3 mt-6">

                      <Metric
                        label="Readiness"
                        value={
                          readiness.score ??
                          manuscript.readiness_score ??
                          "--"
                        }
                      />

                      <Metric
                        label="References"
                        value={
                          references.verification_score ??
                          "--"
                        }
                      />

                      <Metric
                        label="Journals"
                        value={
                          journals.length
                        }
                      />

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onOpenAnalysis(
                          result
                        )
                      }
                      className="w-full mt-6 flex items-center justify-center gap-2 border border-blue-200 text-blue-700 bg-blue-50 py-3 rounded-xl font-semibold hover:bg-blue-100"
                    >

                      Open Analysis

                      <ExternalLink
                        size={17}
                      />

                    </button>

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>

    </div>
  );
}

// =========================================================
// METRIC
// =========================================================

function Metric({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-bold text-lg mt-1">{value}</p>
    </div>
  );
}

export default LibraryPage;