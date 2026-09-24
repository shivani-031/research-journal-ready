import { useRef, useState } from "react";

const ScoreBar = ({ label, score }) => {
  const value = typeof score === "number" ? score : 0;

  return (
    <div className="mb-5">
      <div className="flex justify-between mb-2">
        <span className="font-medium text-slate-700">
          {label}
        </span>

        <span className="font-bold text-slate-900">
          {value}/100
        </span>
      </div>

      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
          }}
        />
      </div>
    </div>
  );
};

function ResearchWorkspace({
  onAnalysisComplete,
  initialAnalysisResult = null,
  initialPage = "home",
}) {
  const [page, setPage] = useState(
    initialAnalysisResult
      ? "results"
      : initialPage
  );

  const [selectedFile, setSelectedFile] = useState(null);

  const [dragging, setDragging] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);

  const [analysisResult, setAnalysisResult] = useState(
    initialAnalysisResult
  );

  const [downloadingReport, setDownloadingReport] =
    useState(false);

  const [error, setError] = useState("");

  const [reportError, setReportError] = useState("");

  const fileInputRef = useRef(null);

  // =========================================================
  // FILE VALIDATION
  // =========================================================

  const validateFile = (file) => {
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (
      !fileName.endsWith(".pdf") &&
      !fileName.endsWith(".docx")
    ) {
      setError("Only PDF and DOCX files are supported.");
      setSelectedFile(null);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("File size must be below 20 MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError("");
  };

  // =========================================================
  // FILE SELECT
  // =========================================================

  const handleFileChange = (event) => {
    validateFile(event.target.files[0]);
  };

  // =========================================================
  // DRAG & DROP
  // =========================================================

  const handleDrop = (event) => {
    event.preventDefault();

    setDragging(false);

    validateFile(event.dataTransfer.files[0]);
  };

  // =========================================================
  // REMOVE FILE
  // =========================================================

  const removeFile = () => {
    setSelectedFile(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =========================================================
  // FORMAT FILE SIZE
  // =========================================================

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // =========================================================
  // OPEN UPLOAD PAGE
  // =========================================================

  const openUploadPage = () => {
    setPage("upload");

    setSelectedFile(null);
    setAnalysisResult(null);

    setError("");
    setReportError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    window.scrollTo(0, 0);
  };

  // =========================================================
  // GO HOME
  // =========================================================

  const goHome = () => {
    setPage("home");

    setSelectedFile(null);

    setError("");
    setReportError("");

    window.scrollTo(0, 0);
  };

  // =========================================================
  // ANALYZE MANUSCRIPT
  // =========================================================

  const analyzeManuscript = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);

    setError("");
    setReportError("");

    const formData = new FormData();

    formData.append("file", selectedFile);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Manuscript analysis failed."
        );
      }

      setAnalysisResult(data);

      // =====================================================
      // SAVE RESULT TO SUPABASE LIBRARY
      // =====================================================

      if (onAnalysisComplete) {
        onAnalysisComplete(data).catch((saveError) => {
          console.error(
            "Could not save analysis to Library:",
            saveError
          );
        });
      }

      setPage("results");

      window.scrollTo(0, 0);
    } catch (err) {
      setError(
        err.message || "Could not connect to backend."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // =========================================================
  // DOWNLOAD PDF REPORT
  // =========================================================

  const downloadReport = async () => {
    if (!analysisResult) return;

    setDownloadingReport(true);

    setReportError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/generate-report",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(analysisResult),
        }
      );

      if (!response.ok) {
        let message = "Could not generate PDF report.";

        try {
          const errorData = await response.json();

          if (errorData.detail) {
            message = errorData.detail;
          }
        } catch {
          // Ignore invalid JSON response
        }

        throw new Error(message);
      }

      const pdfBlob = await response.blob();

      const url =
        window.URL.createObjectURL(pdfBlob);

      const link =
        document.createElement("a");

      let originalName =
        analysisResult.file?.filename ||
        "manuscript";

      originalName = originalName.replace(
        /\.(pdf|docx)$/i,
        ""
      );

      link.href = url;

      link.download =
        `${originalName}_ResearchReady_Report.pdf`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setReportError(
        err.message || "Could not download report."
      );
    } finally {
      setDownloadingReport(false);
    }
  };

  // =========================================================
  // REFERENCE STATUS
  // =========================================================

  const getReferenceStatus = (status) => {
    if (status === "verified") {
      return {
        label: "Verified",
        icon: "✓",
        box: "bg-green-50 border-green-200",
        badge: "bg-green-100 text-green-700",
      };
    }

    if (status === "possible_match") {
      return {
        label: "Possible Match",
        icon: "⚠",
        box: "bg-orange-50 border-orange-200",
        badge: "bg-orange-100 text-orange-700",
      };
    }

    if (status === "lookup_error") {
      return {
        label: "Lookup Error",
        icon: "!",
        box: "bg-slate-50 border-slate-200",
        badge: "bg-slate-200 text-slate-700",
      };
    }

    return {
      label: "Unverified",
      icon: "?",
      box: "bg-red-50 border-red-200",
      badge: "bg-red-100 text-red-700",
    };
  };

  // =========================================================
  // RESULTS PAGE
  // =========================================================

  if (
    page === "results" &&
    analysisResult
  ) {
    const result = analysisResult;

    const structure =
      result.structure_analysis || {};

    const statistics =
      result.statistics || {};

    const sections =
      structure.sections || {};

    const ai =
      result.ai_analysis || {};

    const readiness =
      result.readiness || {};

    const abstract =
      result.abstract_analysis || {};

    const keywords =
      result.keyword_analysis || {};

    const references =
      result.reference_analysis || {};

    const journalAnalysis =
      result.journal_analysis || {};

    const journals =
      journalAnalysis.journals || [];

    const aiAvailable =
      ai.available === true;

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">

        {/* NAVBAR */}

        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">

          <div className="px-6 md:px-12 lg:px-16 py-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">

            <button
              onClick={goHome}
              className="text-2xl md:text-3xl font-bold text-blue-600 text-left"
            >
              ResearchReady AI
            </button>

            <div className="flex flex-wrap gap-3">

              <button
                onClick={downloadReport}
                disabled={downloadingReport}
                className={`px-5 py-2.5 rounded-xl font-semibold transition ${
                  downloadingReport
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {downloadingReport
                  ? "Preparing Report..."
                  : "↓ Download Report"}
              </button>

              <button
                onClick={openUploadPage}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Analyze Another Paper
              </button>

            </div>

          </div>

        </nav>

        <main className="px-6 md:px-10 lg:px-16 py-10">

          {/* HEADER */}

          <div className="max-w-7xl mx-auto mb-10">

            <p className="text-blue-600 font-bold text-sm tracking-wide">
              AI MANUSCRIPT ANALYSIS
            </p>

            <h1 className="text-3xl md:text-5xl font-bold mt-2">
              Journal Readiness Report
            </h1>

            <p className="text-slate-500 mt-3">
              {result.file?.filename}
            </p>

          </div>

          {reportError && (
            <div className="max-w-7xl mx-auto bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
              {reportError}
            </div>
          )}

          {/* READINESS HERO */}

          <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 md:p-10 text-white shadow-sm">

              <p className="text-blue-100 font-medium">
                Overall Journal Readiness
              </p>

              <div className="flex flex-col md:flex-row md:items-end gap-4 mt-4">

                <div className="text-6xl md:text-7xl font-bold">
                  {readiness.score ??
                    structure.score ??
                    0}
                </div>

                <div className="pb-2">

                  <p className="text-2xl font-bold">
                    {readiness.status ||
                      "Preliminary"}
                  </p>

                  <p className="text-blue-100 mt-1">
                    out of 100
                  </p>

                </div>

              </div>

              <p className="text-blue-100 mt-6 leading-7 max-w-2xl">

                {readiness.note ||
                  "This is a heuristic pre-submission quality score and does not predict journal acceptance."}

              </p>

              <button
                onClick={downloadReport}
                disabled={downloadingReport}
                className={`mt-8 px-6 py-3 rounded-xl font-bold transition ${
                  downloadingReport
                    ? "bg-blue-400 text-blue-100 cursor-not-allowed"
                    : "bg-white text-blue-700 hover:bg-blue-50"
                }`}
              >

                {downloadingReport
                  ? "Generating PDF..."
                  : "↓ Download Full Readiness Report"}

              </button>

            </div>

            {/* AI STATUS */}

            <div className="bg-white border border-slate-200 rounded-3xl p-8">

              <p className="text-sm text-slate-500">
                AI Analysis
              </p>

              <h2 className="text-2xl font-bold mt-2">

                {aiAvailable
                  ? "Analysis Complete"
                  : "Basic Analysis"}

              </h2>

              <div
                className={`inline-flex px-4 py-2 rounded-full mt-5 font-semibold text-sm ${
                  aiAvailable
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >

                {aiAvailable
                  ? "✓ AI Connected"
                  : "⚠ AI Unavailable"}

              </div>

              {!aiAvailable &&
                ai.message && (

                  <p className="text-sm text-slate-500 leading-6 mt-5">
                    {ai.message}
                  </p>

                )}

            </div>

          </div>

          {/* STAT CARDS */}

          <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-6 gap-4 mt-7">

            <StatCard
              title="Structure"
              value={structure.score ?? 0}
            />

            <StatCard
              title="AI Quality"
              value={
                aiAvailable
                  ? ai.ai_score
                  : "--"
              }
            />

            <StatCard
              title="References"
              value={
                references.total_checked ??
                0
              }
            />

            <StatCard
              title="Reference Score"
              value={
                references.verification_score ??
                0
              }
            />

            <StatCard
              title="Journal Matches"
              value={journals.length}
            />

            <StatCard
              title="Words"
              value={
                statistics.word_count ??
                0
              }
            />

          </div>

          {/* AI QUALITY */}

          {aiAvailable && (

            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-7 mt-8">

              <div className="bg-white border border-slate-200 rounded-3xl p-8">

                <h2 className="text-2xl font-bold">
                  AI Quality Scores
                </h2>

                <p className="text-slate-500 mt-2 mb-7">
                  AI-assisted assessment of manuscript quality.
                </p>

                <ScoreBar
                  label="Abstract Quality"
                  score={ai.abstract_score}
                />

                <ScoreBar
                  label="Academic Writing"
                  score={ai.academic_writing_score}
                />

                <ScoreBar
                  label="Research Clarity"
                  score={ai.research_clarity_score}
                />

                <ScoreBar
                  label="Methodology"
                  score={ai.methodology_clarity_score}
                />

                <ScoreBar
                  label="Results"
                  score={ai.results_clarity_score}
                />

                <ScoreBar
                  label="Conclusion"
                  score={ai.conclusion_score}
                />

              </div>

              {/* ABSTRACT CHECK */}

              <div className="bg-white border border-slate-200 rounded-3xl p-8">

                <h2 className="text-2xl font-bold">
                  Abstract Completeness
                </h2>

                <p className="text-slate-500 mt-2">
                  Key research elements detected in your abstract.
                </p>

                <div className="space-y-4 mt-7">

                  {[
                    [
                      "Research Problem",
                      ai.abstract_checks
                        ?.research_problem_present,
                    ],
                    [
                      "Research Objective",
                      ai.abstract_checks
                        ?.objective_present,
                    ],
                    [
                      "Methodology",
                      ai.abstract_checks
                        ?.methodology_present,
                    ],
                    [
                      "Results",
                      ai.abstract_checks
                        ?.results_present,
                    ],
                    [
                      "Conclusion",
                      ai.abstract_checks
                        ?.conclusion_present,
                    ],
                  ].map(
                    ([label, present]) => (

                      <div
                        key={label}
                        className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${
                          present
                            ? "bg-green-50 border-green-200"
                            : "bg-orange-50 border-orange-200"
                        }`}
                      >

                        <span className="font-medium">
                          {label}
                        </span>

                        <span
                          className={
                            present
                              ? "text-green-600 font-semibold"
                              : "text-orange-600 font-semibold"
                          }
                        >

                          {present
                            ? "✓ Present"
                            : "⚠ Missing"}

                        </span>

                      </div>

                    )
                  )}

                </div>

              </div>

            </div>

          )}

          {/* AI SUMMARY */}

          {aiAvailable &&
            ai.summary && (

              <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 mt-8">

                <p className="text-sm font-bold text-blue-600">
                  AI SUMMARY
                </p>

                <h2 className="text-2xl font-bold mt-2">
                  Manuscript Overview
                </h2>

                <p className="text-slate-600 leading-8 mt-4">
                  {ai.summary}
                </p>

              </div>

            )}

          {/* STRENGTHS + RECOMMENDATIONS */}

          {aiAvailable && (

            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-7 mt-8">

              <div className="bg-white border border-slate-200 rounded-3xl p-8">

                <h2 className="text-2xl font-bold">
                  ✓ Strengths
                </h2>

                <p className="text-slate-500 mt-2">
                  Positive aspects detected in your manuscript.
                </p>

                <div className="space-y-4 mt-6">

                  {ai.strengths?.length > 0 ? (

                    ai.strengths.map(
                      (strength, index) => (

                        <div
                          key={index}
                          className="bg-green-50 border border-green-200 rounded-xl p-4"
                        >

                          <p className="text-slate-700 leading-7">
                            ✓ {strength}
                          </p>

                        </div>

                      )
                    )

                  ) : (

                    <p className="text-slate-500">
                      No strengths returned.
                    </p>

                  )}

                </div>

              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-8">

                <h2 className="text-2xl font-bold">
                  ✨ Recommendations
                </h2>

                <p className="text-slate-500 mt-2">
                  Suggested improvements before submission.
                </p>

                <div className="space-y-4 mt-6">

                  {ai.recommendations?.length > 0 ? (

                    ai.recommendations.map(
                      (
                        recommendation,
                        index
                      ) => (

                        <div
                          key={index}
                          className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3"
                        >

                          <span className="font-bold text-blue-600">
                            {index + 1}.
                          </span>

                          <p className="text-slate-700 leading-7">
                            {recommendation}
                          </p>

                        </div>

                      )
                    )

                  ) : (

                    <p className="text-slate-500">
                      No recommendations returned.
                    </p>

                  )}

                </div>

              </div>

            </div>

          )}

          {/* AI ISSUES */}

          {aiAvailable && (

            <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 mt-8">

              <h2 className="text-2xl font-bold">
                AI-Detected Issues
              </h2>

              <p className="text-slate-500 mt-2">
                Areas that may need attention before submission.
              </p>

              {ai.issues?.length > 0 ? (

                <div className="space-y-5 mt-7">

                  {ai.issues.map(
                    (issue, index) => {
                      const severity =
                        issue.severity;

                      const cardStyle =
                        severity === "high"
                          ? "bg-red-50 border-red-200"
                          : severity === "medium"
                            ? "bg-orange-50 border-orange-200"
                            : "bg-yellow-50 border-yellow-200";

                      return (
                        <div
                          key={index}
                          className={`border rounded-2xl p-6 ${cardStyle}`}
                        >

                          <div className="flex flex-col sm:flex-row justify-between gap-4">

                            <div>

                              <p className="font-bold">
                                {issue.issue}
                              </p>

                              <p className="text-sm text-slate-500 mt-1">
                                {issue.category}
                              </p>

                            </div>

                            <span className="bg-white px-3 py-1 rounded-full text-xs font-bold uppercase h-fit">
                              {issue.severity}
                            </span>

                          </div>

                          <div className="bg-white/70 p-4 rounded-xl mt-4">

                            <p className="font-semibold text-sm">
                              Recommendation
                            </p>

                            <p className="text-slate-600 leading-7 mt-2">
                              {issue.recommendation}
                            </p>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              ) : (

                <div className="bg-green-50 border border-green-200 rounded-xl p-5 mt-6">

                  <p className="text-green-700 font-semibold">
                    ✓ No major AI issues detected.
                  </p>

                </div>

              )}

            </div>

          )}

          {/* REFERENCE VERIFICATION */}

          <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 mt-8">

            <p className="text-blue-600 font-bold text-sm">
              CROSSREF VERIFICATION
            </p>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mt-2">

              <div>

                <h2 className="text-2xl md:text-3xl font-bold">
                  Citation & Reference Verification
                </h2>

                <p className="text-slate-500 mt-2">
                  Scholarly metadata matching for references detected in your manuscript.
                </p>

              </div>

              <div>

                <p className="text-sm text-slate-500">
                  Verification Score
                </p>

                <p className="text-4xl font-bold text-blue-600">

                  {references.verification_score ?? 0}

                  <span className="text-base text-slate-400">
                    /100
                  </span>

                </p>

              </div>

            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">

              <MiniCard
                label="Checked"
                value={
                  references.total_checked ??
                  0
                }
              />

              <MiniCard
                label="Verified"
                value={
                  references.verified ??
                  0
                }
              />

              <MiniCard
                label="Possible Matches"
                value={
                  references.possible_matches ??
                  0
                }
              />

              <MiniCard
                label="Unverified"
                value={
                  references.unverified ??
                  0
                }
              />

            </div>

            {references.message && (

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-6">

                <p className="text-sm text-blue-800 leading-6">
                  ℹ️ {references.message}
                </p>

              </div>

            )}

            {references.references?.length > 0 ? (

              <div className="space-y-5 mt-8">

                {references.references.map(
                  (
                    reference,
                    index
                  ) => {
                    const status =
                      getReferenceStatus(
                        reference.status
                      );

                    return (
                      <div
                        key={index}
                        className={`border rounded-2xl p-6 ${status.box}`}
                      >

                        <div className="flex flex-col md:flex-row justify-between gap-4">

                          <div className="flex-1">

                            <div className="flex flex-wrap gap-3 items-center">

                              <p className="font-bold">
                                Reference {index + 1}
                              </p>

                              <span
                                className={`text-xs font-bold px-3 py-1 rounded-full ${status.badge}`}
                              >
                                {status.icon}{" "}
                                {status.label}
                              </span>

                            </div>

                            <p className="text-sm text-slate-600 leading-7 mt-4">
                              {reference.original_reference}
                            </p>

                          </div>

                          <div>

                            <p className="text-xs text-slate-500">
                              Confidence
                            </p>

                            <p className="text-xl font-bold">
                              {reference.confidence ?? 0}%
                            </p>

                          </div>

                        </div>

                        {reference.matched_title && (

                          <div className="bg-white/80 rounded-xl p-5 mt-5">

                            <p className="text-xs font-bold text-blue-600">
                              CROSSREF MATCH
                            </p>

                            <h3 className="font-bold text-lg mt-2">
                              {reference.matched_title}
                            </h3>

                            <div className="grid md:grid-cols-4 gap-4 mt-5">

                              <InfoBox
                                label="Journal"
                                value={reference.journal}
                              />

                              <InfoBox
                                label="Year"
                                value={reference.year}
                              />

                              <InfoBox
                                label="DOI"
                                value={reference.doi}
                              />

                              <InfoBox
                                label="Type"
                                value={
                                  reference.publication_type
                                }
                              />

                            </div>

                          </div>

                        )}

                      </div>
                    );
                  }
                )}

              </div>

            ) : (

              <div className="bg-slate-50 rounded-xl p-6 mt-7 text-center">

                <p className="text-slate-500">
                  No references were available for verification.
                </p>

              </div>

            )}

          </div>

          {/* JOURNAL FINDER */}

          <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 mt-8">

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">

              <div>

                <p className="text-purple-600 font-bold text-sm">
                  JOURNAL FINDER
                </p>

                <h2 className="text-2xl md:text-3xl font-bold mt-2">
                  Recommended Journals
                </h2>

                <p className="text-slate-500 mt-2 max-w-3xl">
                  Journals are identified using scholarly articles related to your manuscript's abstract and keywords.
                </p>

              </div>

              <div className="bg-purple-50 border border-purple-100 px-5 py-4 rounded-2xl">

                <p className="text-sm text-purple-600">
                  Candidate Journals
                </p>

                <p className="text-3xl font-bold text-purple-700">

                  {journalAnalysis.total_candidate_journals ??
                    journals.length}

                </p>

              </div>

            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6">

              <p className="text-sm text-amber-800 leading-6">
                ℹ️ Relevance represents topic similarity. It is not an acceptance probability or guarantee that a journal will accept the manuscript.
              </p>

            </div>

            {journalAnalysis.available === false && (

              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 mt-6">

                {journalAnalysis.message ||
                  "Journal recommendations are currently unavailable."}

              </div>

            )}

            {journals.length > 0 ? (

              <div className="grid lg:grid-cols-2 gap-6 mt-8">

                {journals.map(
                  (
                    journal,
                    index
                  ) => (

                    <div
                      key={`${journal.journal_name}-${index}`}
                      className="border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition"
                    >

                      <div className="flex justify-between gap-4">

                        <div>

                          <div className="inline-flex bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
                            Match #{index + 1}
                          </div>

                          <h3 className="text-xl font-bold mt-4">
                            {journal.journal_name}
                          </h3>

                          <p className="text-sm text-slate-500 mt-2">
                            {journal.publisher ||
                              "Publisher not available"}
                          </p>

                        </div>

                        <div className="text-right">

                          <p className="text-3xl font-bold text-purple-600">
                            {journal.relevance_score ?? 0}%
                          </p>

                          <p className="text-xs text-slate-500">
                            topic relevance
                          </p>

                        </div>

                      </div>

                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mt-5">

                        <div
                          className="h-full bg-purple-600 rounded-full"
                          style={{
                            width: `${
                              journal.relevance_score ??
                              0
                            }%`,
                          }}
                        />

                      </div>

                      <div className="bg-purple-50 rounded-xl p-4 mt-5">

                        <p className="text-sm text-purple-900 leading-6">
                          {journal.reason}
                        </p>

                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-5">

                        <div>

                          <p className="text-xs text-slate-500">
                            Related Papers
                          </p>

                          <p className="font-bold mt-1">
                            {journal.related_papers ?? 0}
                          </p>

                        </div>

                        <div>

                          <p className="text-xs text-slate-500">
                            ISSN
                          </p>

                          <p className="text-sm font-medium mt-1">
                            {journal.issns?.length > 0
                              ? journal.issns.join(", ")
                              : "Not available"}
                          </p>

                        </div>

                      </div>

                      {journal.sample_articles?.length > 0 && (

                        <details className="mt-6">

                          <summary className="cursor-pointer text-blue-600 font-semibold">
                            View related articles
                          </summary>

                          <div className="space-y-3 mt-4">

                            {journal.sample_articles.map(
                              (
                                article,
                                articleIndex
                              ) => (

                                <div
                                  key={articleIndex}
                                  className="bg-slate-50 rounded-xl p-4"
                                >

                                  <p className="font-medium text-sm leading-6">
                                    {article.title}
                                  </p>

                                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">

                                    {article.year && (

                                      <span>
                                        Year: {article.year}
                                      </span>

                                    )}

                                    {article.doi && (

                                      <a
                                        href={`https://doi.org/${article.doi}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:underline break-all"
                                      >
                                        DOI: {article.doi}
                                      </a>

                                    )}

                                  </div>

                                </div>

                              )
                            )}

                          </div>

                        </details>

                      )}

                    </div>

                  )
                )}

              </div>

            ) : (

              <div className="bg-slate-50 rounded-xl p-6 mt-7 text-center">

                <p className="text-slate-500">
                  No journal recommendations were found.
                </p>

              </div>

            )}

          </div>

          {/* STRUCTURE */}

          <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 mt-8">

            <h2 className="text-2xl font-bold">
              Manuscript Structure
            </h2>

            <p className="text-slate-500 mt-2">
              Sections detected in your research manuscript.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-7">

              {Object.entries(
                sections
              ).map(
                ([
                  section,
                  detected,
                ]) => (

                  <div
                    key={section}
                    className={`border rounded-xl p-4 flex justify-between gap-4 ${
                      detected
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >

                    <span className="capitalize font-medium">
                      {section.replaceAll(
                        "_",
                        " "
                      )}
                    </span>

                    <span
                      className={
                        detected
                          ? "text-green-600 font-semibold"
                          : "text-red-500 font-semibold"
                      }
                    >
                      {detected
                        ? "✓ Detected"
                        : "✕ Missing"}
                    </span>

                  </div>

                )
              )}

            </div>

          </div>

          {/* ABSTRACT + KEYWORDS */}

          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-7 mt-8">

            <div className="bg-white border border-slate-200 rounded-3xl p-8">

              <h2 className="text-xl font-bold">
                Abstract Analysis
              </h2>

              <div className="space-y-4 mt-6">

                <InfoBox
                  label="Detected"
                  value={
                    abstract.found
                      ? "Yes"
                      : "No"
                  }
                />

                <InfoBox
                  label="Word Count"
                  value={
                    abstract.word_count ??
                    0
                  }
                />

                <InfoBox
                  label="Length Assessment"
                  value={
                    abstract.status ||
                    "--"
                  }
                />

              </div>

              <p className="text-slate-600 leading-7 mt-5">
                {abstract.message}
              </p>

            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-8">

              <h2 className="text-xl font-bold">
                Keywords
              </h2>

              <p className="text-slate-500 mt-2">
                Keywords detected in the manuscript.
              </p>

              <div className="flex flex-wrap gap-2 mt-6">

                {keywords.keywords?.length > 0 ? (

                  keywords.keywords.map(
                    (
                      keyword,
                      index
                    ) => (

                      <span
                        key={index}
                        className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-2 rounded-full text-sm"
                      >
                        {keyword}
                      </span>

                    )
                  )

                ) : (

                  <p className="text-slate-500">
                    No keywords detected.
                  </p>

                )}

              </div>

            </div>

          </div>

          {/* DOCUMENT DETAILS */}

          <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 mt-8">

            <h2 className="text-xl font-bold">
              Document Details
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">

              <InfoBox
                label="File Type"
                value={
                  result.file?.file_type
                }
              />

              <InfoBox
                label="File Size"
                value={
                  formatFileSize(
                    result.file?.size_bytes
                  )
                }
              />

              <InfoBox
                label="Characters"
                value={
                  statistics.character_count ??
                  0
                }
              />

              <InfoBox
                label="Paragraphs"
                value={
                  statistics.paragraph_count ??
                  0
                }
              />

            </div>

          </div>

          {/* TEXT PREVIEW */}

          <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 mt-8">

            <h2 className="text-xl font-bold">
              Extracted Manuscript Preview
            </h2>

            <p className="text-slate-500 mt-2">
              Preview of the text extracted from the uploaded manuscript.
            </p>

            <div className="bg-slate-50 rounded-xl p-6 mt-5 max-h-80 overflow-y-auto">

              <p className="whitespace-pre-line text-sm text-slate-700 leading-7">
                {result.text_preview}
              </p>

            </div>

          </div>

          {/* DOWNLOAD REPORT */}

          <div className="max-w-7xl mx-auto bg-slate-900 rounded-3xl p-10 md:p-14 mt-8">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

              <div>

                <p className="text-blue-400 font-bold text-sm">
                  FINAL REPORT
                </p>

                <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
                  Your complete readiness report is ready
                </h2>

                <p className="text-slate-300 mt-4 max-w-2xl leading-7">
                  Download a professional PDF containing your manuscript scores, AI assessment, recommendations, reference verification and journal suggestions.
                </p>

              </div>

              <button
                onClick={downloadReport}
                disabled={downloadingReport}
                className={`shrink-0 px-8 py-4 rounded-xl font-bold text-lg transition ${
                  downloadingReport
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-white text-slate-900 hover:bg-blue-50"
                }`}
              >

                {downloadingReport
                  ? "Preparing PDF..."
                  : "↓ Download Full Report"}

              </button>

            </div>

          </div>

          {/* NEW ANALYSIS */}

          <div className="max-w-7xl mx-auto bg-blue-600 rounded-3xl p-12 mt-8 text-center">

            <h2 className="text-3xl font-bold text-white">
              Analyze another manuscript
            </h2>

            <p className="text-blue-100 mt-3">
              Upload another paper to create a new research readiness report.
            </p>

            <button
              onClick={openUploadPage}
              className="bg-white text-blue-600 font-bold px-8 py-4 rounded-xl mt-7 hover:bg-blue-50"
            >
              Upload Another Paper
            </button>

          </div>

        </main>

      </div>
    );
  }

  // =========================================================
  // UPLOAD PAGE
  // =========================================================

  if (page === "upload") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">

        <nav className="bg-white border-b border-slate-200">

          <div className="px-6 md:px-12 lg:px-16 py-4 flex items-center justify-between">

            <button
              onClick={goHome}
              className="text-2xl md:text-3xl font-bold text-blue-600"
            >
              ResearchReady AI
            </button>

            <button
              onClick={goHome}
              className="text-slate-600 font-medium hover:text-blue-600"
            >
              ← Back to Home
            </button>

          </div>

        </nav>

        <main className="px-6 py-14 md:py-20">

          <div className="max-w-4xl mx-auto">

            <div className="text-center">

              <div className="inline-flex bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold">
                AI Research Analysis
              </div>

              <h1 className="text-3xl md:text-5xl font-bold mt-5">
                Upload Your Research Paper
              </h1>

              <p className="text-lg text-slate-600 max-w-2xl mx-auto mt-5 leading-8">
                Analyze manuscript quality, verify scholarly references, discover related journals and generate a complete readiness report.
              </p>

            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-10 mt-10">

              <div
                onDragOver={(event) => {
                  event.preventDefault();

                  setDragging(true);
                }}
                onDragLeave={() =>
                  setDragging(false)
                }
                onDrop={handleDrop}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className={`border-2 border-dashed rounded-2xl px-6 py-16 text-center cursor-pointer transition ${
                  dragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30"
                }`}
              >

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center text-3xl">
                  📄
                </div>

                <h2 className="text-xl md:text-2xl font-bold mt-5">
                  Drag & drop your manuscript
                </h2>

                <p className="text-slate-500 mt-3">
                  or click to browse your computer
                </p>

                <div className="inline-block bg-blue-600 text-white px-7 py-3 rounded-xl font-semibold mt-6">
                  Choose File
                </div>

                <p className="text-sm text-slate-400 mt-5">
                  PDF or DOCX • Maximum 20 MB
                </p>

              </div>

              {error && (

                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mt-5">
                  {error}
                </div>

              )}

              {selectedFile && (

                <div className="border border-slate-200 rounded-xl p-5 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                  <div className="flex items-center gap-4">

                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
                      📑
                    </div>

                    <div>

                      <p className="font-semibold break-all">
                        {selectedFile.name}
                      </p>

                      <p className="text-sm text-slate-500 mt-1">
                        {formatFileSize(
                          selectedFile.size
                        )}
                      </p>

                    </div>

                  </div>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();

                      removeFile();
                    }}
                    className="text-red-500 font-medium hover:text-red-700"
                  >
                    Remove
                  </button>

                </div>

              )}

              {/* ANALYSIS STEPS */}

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-7">

                {[
                  "Extract",
                  "Structure",
                  "AI Review",
                  "References",
                  "Journal Match",
                  "Report",
                ].map(
                  (
                    label,
                    index
                  ) => (

                    <div
                      key={label}
                      className="bg-slate-50 rounded-xl p-3 text-center"
                    >

                      <div className="w-8 h-8 mx-auto bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>

                      <p className="text-xs font-medium mt-2">
                        {label}
                      </p>

                    </div>

                  )
                )}

              </div>

              <button
                onClick={analyzeManuscript}
                disabled={
                  !selectedFile ||
                  analyzing
                }
                className={`w-full py-4 rounded-xl font-bold text-lg mt-7 transition ${
                  selectedFile &&
                  !analyzing
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >

                {analyzing
                  ? "Analyzing Manuscript..."
                  : "Analyze Manuscript"}

              </button>

              {analyzing && (

                <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4">

                  <p className="text-center text-sm text-blue-700 font-medium">
                    Analyzing manuscript quality, references and related journals...
                  </p>

                  <p className="text-center text-xs text-blue-500 mt-2">
                    This may take several seconds.
                  </p>

                </div>

              )}

            </div>

          </div>

        </main>

      </div>
    );
  }

  // =========================================================
  // HOME PAGE
  // =========================================================

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* NAVBAR */}

      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">

        <div className="px-6 md:px-12 lg:px-16 py-4 flex items-center justify-between">

          <button
            onClick={goHome}
            className="text-2xl md:text-3xl font-bold text-blue-600"
          >
            ResearchReady AI
          </button>

          <div className="hidden md:flex gap-10 text-slate-700 font-medium">

            <a
              href="#features"
              className="hover:text-blue-600"
            >
              Features
            </a>

            <a
              href="#how"
              className="hover:text-blue-600"
            >
              How It Works
            </a>

            <a
              href="#about"
              className="hover:text-blue-600"
            >
              About
            </a>

          </div>

          <button
            onClick={openUploadPage}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
          >
            Get Started
          </button>

        </div>

      </nav>

      {/* HERO */}

      <section className="min-h-[75vh] flex items-center bg-gradient-to-b from-blue-50 to-white px-6 py-20">

        <div className="max-w-6xl mx-auto text-center">

          <div className="inline-flex bg-blue-100 text-blue-700 px-5 py-2 rounded-full font-semibold">
            ✨ AI-Powered Research Assistant
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mt-8">

            Make Your Research{" "}

            <span className="text-blue-600">
              Journal-Ready
            </span>

          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mt-7 leading-8">
            Analyze manuscript quality, verify scholarly references, discover relevant journals and generate a professional pre-submission report.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">

            <button
              onClick={openUploadPage}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-md hover:bg-blue-700"
            >
              Analyze My Manuscript
            </button>

            <a
              href="#how"
              className="border border-slate-300 bg-white px-8 py-4 rounded-xl font-semibold text-lg"
            >
              See How It Works
            </a>

          </div>

        </div>

      </section>

      {/* FEATURES */}

      <section
        id="features"
        className="bg-slate-50 px-6 py-24"
      >

        <div className="max-w-7xl mx-auto">

          <div className="text-center">

            <p className="text-blue-600 font-semibold">
              RESEARCH ANALYSIS PLATFORM
            </p>

            <h2 className="text-3xl md:text-5xl font-bold mt-3">
              Everything Your Manuscript Needs
            </h2>

          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7 mt-14">

            {[
              [
                "📄",
                "Structure Detection",
                "Detect essential research sections and manuscript completeness.",
              ],

              [
                "🧠",
                "AI Manuscript Review",
                "Evaluate academic writing, clarity, methodology and results.",
              ],

              [
                "🔗",
                "Reference Verification",
                "Match references with scholarly Crossref metadata.",
              ],

              [
                "🎯",
                "Journal Finder",
                "Discover journals related to your manuscript's topic.",
              ],

              [
                "📊",
                "Readiness Score",
                "Generate a pre-submission manuscript quality indicator.",
              ],

              [
                "📥",
                "Downloadable Report",
                "Download a complete professional readiness report as PDF.",
              ],
            ].map(
              ([
                icon,
                title,
                description,
              ]) => (

                <div
                  key={title}
                  className="bg-white border border-slate-200 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-lg transition"
                >

                  <div className="text-3xl">
                    {icon}
                  </div>

                  <h3 className="text-xl font-bold mt-5">
                    {title}
                  </h3>

                  <p className="text-slate-600 leading-7 mt-3">
                    {description}
                  </p>

                </div>

              )
            )}

          </div>

        </div>

      </section>

      {/* HOW IT WORKS */}

      <section
        id="how"
        className="px-6 py-24"
      >

        <div className="max-w-7xl mx-auto">

          <div className="text-center">

            <p className="text-blue-600 font-semibold">
              HOW IT WORKS
            </p>

            <h2 className="text-3xl md:text-5xl font-bold mt-3">
              From Manuscript to Complete Report
            </h2>

          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6 mt-16">

            {[
              "Upload",
              "Extract",
              "Analyze",
              "Verify",
              "Recommend",
              "Download",
            ].map(
              (
                step,
                index
              ) => (

                <div
                  key={step}
                  className="text-center"
                >

                  <div className="w-14 h-14 bg-blue-600 text-white rounded-full mx-auto flex items-center justify-center font-bold">
                    {index + 1}
                  </div>

                  <p className="font-bold mt-4">
                    {step}
                  </p>

                </div>

              )
            )}

          </div>

        </div>

      </section>

      {/* ABOUT */}

      <section
        id="about"
        className="bg-slate-50 py-24 px-6"
      >

        <div className="max-w-4xl mx-auto text-center">

          <p className="text-blue-600 font-semibold">
            ABOUT
          </p>

          <h2 className="text-3xl md:text-5xl font-bold mt-3">
            Research support before submission
          </h2>

          <p className="text-lg text-slate-600 mt-6 leading-8">
            ResearchReady AI combines manuscript structure analysis, AI-assisted academic review, scholarly reference verification, journal discovery and downloadable reporting in one pre-submission platform.
          </p>

          <p className="text-sm text-slate-500 mt-5">
            Readiness and journal relevance values are heuristic indicators and do not predict journal acceptance.
          </p>

        </div>

      </section>

      {/* CTA */}

      <section className="px-6 py-20">

        <div className="max-w-6xl mx-auto bg-blue-600 rounded-3xl p-14 text-center">

          <h2 className="text-3xl md:text-5xl font-bold text-white">
            Is your manuscript journal-ready?
          </h2>

          <p className="text-blue-100 text-lg mt-5">
            Upload your research paper and generate a complete readiness report.
          </p>

          <button
            onClick={openUploadPage}
            className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold mt-8 hover:bg-blue-50"
          >
            Analyze My Manuscript
          </button>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="bg-slate-950 text-white">

        <div className="px-6 md:px-12 lg:px-16 py-12">

          <h3 className="font-bold text-2xl">
            ResearchReady AI
          </h3>

          <p className="text-slate-400 mt-2">
            Research smarter. Prepare with confidence.
          </p>

        </div>

        <div className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
          © 2026 ResearchReady AI
        </div>

      </footer>

    </div>
  );
}


// =========================================================
// SMALL COMPONENTS
// =========================================================

function StatCard({
  title,
  value,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="text-3xl font-bold mt-2">
        {value}
      </p>

    </div>
  );
}


function MiniCard({
  label,
  value,
}) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">

      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="text-3xl font-bold mt-2">
        {value}
      </p>

    </div>
  );
}


function InfoBox({
  label,
  value,
}) {
  const displayValue =
    value === 0
      ? 0
      : value || "Not available";

  return (
    <div>

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="font-medium mt-1 break-words">
        {displayValue}
      </p>

    </div>
  );
}


export default ResearchWorkspace;