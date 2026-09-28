import { useRef, useState } from "react";


// ============================================================
// BACKEND URL
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";


// ============================================================
// RESEARCH WORKSPACE
// ============================================================

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

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [dragging, setDragging] =
    useState(false);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [
    analysisResult,
    setAnalysisResult,
  ] = useState(
    initialAnalysisResult
  );

  const [
    downloadingReport,
    setDownloadingReport,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    reportError,
    setReportError,
  ] = useState("");

  const fileInputRef = useRef(null);


  // ============================================================
  // FILE VALIDATION
  // ============================================================

  const validateFile = (file) => {
    if (!file) return;

    const fileName =
      file.name.toLowerCase();

    const valid =
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".docx");

    if (!valid) {
      setError(
        "Only PDF and DOCX files are supported."
      );

      setSelectedFile(null);

      return;
    }

    if (
      file.size >
      20 * 1024 * 1024
    ) {
      setError(
        "Maximum file size is 20 MB."
      );

      setSelectedFile(null);

      return;
    }

    setSelectedFile(file);

    setError("");
  };


  // ============================================================
  // FILE SELECT
  // ============================================================

  const handleFileChange = (event) => {
    validateFile(
      event.target.files?.[0]
    );
  };


  // ============================================================
  // DRAG AND DROP
  // ============================================================

  const handleDrop = (event) => {
    event.preventDefault();

    setDragging(false);

    validateFile(
      event.dataTransfer.files?.[0]
    );
  };


  // ============================================================
  // REMOVE FILE
  // ============================================================

  const removeFile = () => {
    setSelectedFile(null);

    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  };


  // ============================================================
  // FORMAT FILE SIZE
  // ============================================================

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  };


  // ============================================================
  // OPEN UPLOAD
  // ============================================================

  const openUploadPage = () => {
    setPage("upload");

    setSelectedFile(null);

    setAnalysisResult(null);

    setError("");

    setReportError("");

    window.scrollTo(0, 0);
  };


  // ============================================================
  // HOME
  // ============================================================

  const goHome = () => {
    setPage("home");

    setError("");

    setReportError("");

    window.scrollTo(0, 0);
  };


  // ============================================================
  // ANALYZE MANUSCRIPT
  // ============================================================

  const analyzeManuscript = async () => {
    if (!selectedFile) {
      setError(
        "Please choose a manuscript first."
      );

      return;
    }

    setAnalyzing(true);

    setError("");

    const formData =
      new FormData();

    formData.append(
      "file",
      selectedFile
    );

    try {
      console.log(
        "ANALYZE API:",
        `${API_BASE_URL}/analyze`
      );

      const response = await fetch(
        `${API_BASE_URL}/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      let data = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            `Analysis failed (${response.status})`
        );
      }

      setAnalysisResult(data);

      if (onAnalysisComplete) {
        try {
          await onAnalysisComplete(
            data
          );
        } catch (saveError) {
          console.error(
            "Library save failed:",
            saveError
          );
        }
      }

      setPage("results");

      window.scrollTo(0, 0);
    } catch (err) {
      console.error(
        "Analysis error:",
        err
      );

      if (
        err.message ===
        "Failed to fetch"
      ) {
        setError(
          "Could not connect to the ResearchReady backend."
        );
      } else {
        setError(
          err.message ||
            "Manuscript analysis failed."
        );
      }
    } finally {
      setAnalyzing(false);
    }
  };


  // ============================================================
  // DOWNLOAD PDF REPORT
  // ============================================================

  const downloadReport = async () => {
    if (!analysisResult) return;

    setDownloadingReport(true);

    setReportError("");

    try {
      console.log(
        "REPORT API:",
        `${API_BASE_URL}/generate-report`
      );

      const response = await fetch(
        `${API_BASE_URL}/generate-report`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            analysisResult
          ),
        }
      );

      if (!response.ok) {
        let message =
          "Could not generate PDF report.";

        try {
          const data =
            await response.json();

          message =
            data?.detail ||
            message;
        } catch {
          // ignore
        }

        throw new Error(message);
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement("a");

      let fileName =
        analysisResult?.file
          ?.filename ||
        selectedFile?.name ||
        "research-paper";

      fileName = fileName.replace(
        /\.(pdf|docx)$/i,
        ""
      );

      link.href = url;

      link.download =
        `${fileName}_ResearchReady_Report.pdf`;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      window.URL.revokeObjectURL(
        url
      );
    } catch (err) {
      console.error(
        "Report error:",
        err
      );

      setReportError(
        err.message ||
          "Could not download report."
      );
    } finally {
      setDownloadingReport(false);
    }
  };


  // ============================================================
  // RESULTS PAGE
  // ============================================================

  if (
    page === "results" &&
    analysisResult
  ) {
    const result =
      analysisResult;

    const statistics =
      result.statistics || {};

    const structure =
      result.structure_analysis ||
      {};

    const ai =
      result.ai_analysis || {};

    const references =
      result.reference_analysis ||
      {};

    const journalAnalysis =
      result.journal_analysis ||
      {};

    const readiness =
      result.readiness || {};

    const journals =
      journalAnalysis.journals ||
      [];


    return (
      <div className="min-h-screen bg-slate-50">

        <div className="bg-white border-b border-slate-200 px-6 md:px-12 py-5 flex flex-col sm:flex-row justify-between gap-4">

          <button
            onClick={goHome}
            className="text-2xl font-bold text-blue-600 text-left"
          >
            ResearchReady AI
          </button>


          <div className="flex gap-3">

            <button
              onClick={downloadReport}
              disabled={
                downloadingReport
              }
              className="bg-slate-900 text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {downloadingReport
                ? "Preparing Report..."
                : "Download Report"}
            </button>


            <button
              onClick={openUploadPage}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold"
            >
              New Analysis
            </button>

          </div>

        </div>


        <main className="max-w-7xl mx-auto px-6 py-10">

          <p className="text-blue-600 font-bold text-sm">
            AI MANUSCRIPT ANALYSIS
          </p>

          <h1 className="text-3xl md:text-5xl font-bold mt-2">
            Journal Readiness Report
          </h1>


          <p className="text-slate-500 mt-2">
            {result?.file?.filename ||
              selectedFile?.name}
          </p>


          {reportError && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mt-6">
              {reportError}
            </div>
          )}


          {/* OVERALL SCORE */}

          <div className="grid lg:grid-cols-3 gap-6 mt-8">

            <div className="lg:col-span-2 bg-blue-600 text-white rounded-3xl p-8">

              <p className="text-blue-100">
                Overall Journal Readiness
              </p>

              <p className="text-7xl font-bold mt-3">
                {readiness.score ??
                  result.overall_score ??
                  structure.score ??
                  0}
              </p>

              <p className="text-xl font-bold mt-4">
                {readiness.status ||
                  "Pre-submission analysis"}
              </p>

              <p className="text-blue-100 mt-4 leading-7">
                This score is a manuscript preparation indicator and does not predict journal acceptance.
              </p>

            </div>


            <div className="bg-white border border-slate-200 rounded-3xl p-8">

              <p className="text-slate-500">
                AI Quality Score
              </p>

              <p className="text-5xl font-bold mt-3">
                {ai.ai_score ?? "--"}
              </p>

              <p className="text-sm text-slate-500 mt-3">
                AI-assisted manuscript quality analysis
              </p>

            </div>

          </div>


          {/* STATS */}

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-7">

            <StatCard
              title="Structure"
              value={
                structure.score ?? 0
              }
            />

            <StatCard
              title="Words"
              value={
                statistics.word_count ??
                0
              }
            />

            <StatCard
              title="Paragraphs"
              value={
                statistics.paragraph_count ??
                0
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
              title="Journal Matches"
              value={
                journals.length
              }
            />

          </div>


          {/* AI SUMMARY */}

          {ai.summary && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 mt-8">

              <h2 className="text-2xl font-bold">
                AI Summary
              </h2>

              <p className="text-slate-600 leading-8 mt-4 whitespace-pre-wrap">
                {ai.summary}
              </p>

            </div>
          )}


          {/* STRENGTHS */}

          {ai.strengths?.length >
            0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 mt-8">

              <h2 className="text-2xl font-bold">
                Strengths
              </h2>

              <div className="space-y-3 mt-5">

                {ai.strengths.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="bg-green-50 border border-green-100 rounded-xl p-4"
                    >
                      ✓ {item}
                    </div>
                  )
                )}

              </div>

            </div>
          )}


          {/* ISSUES */}

          {ai.issues?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 mt-8">

              <h2 className="text-2xl font-bold">
                Issues Found
              </h2>

              <div className="space-y-3 mt-5">

                {ai.issues.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="bg-red-50 border border-red-100 rounded-xl p-4"
                    >
                      {item}
                    </div>
                  )
                )}

              </div>

            </div>
          )}


          {/* RECOMMENDATIONS */}

          {ai.recommendations
            ?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 mt-8">

              <h2 className="text-2xl font-bold">
                Recommendations
              </h2>

              <div className="space-y-3 mt-5">

                {ai.recommendations.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="bg-blue-50 border border-blue-100 rounded-xl p-4"
                    >
                      {index + 1}. {item}
                    </div>
                  )
                )}

              </div>

            </div>
          )}


          {/* REFERENCES */}

          <div className="bg-white border border-slate-200 rounded-3xl p-8 mt-8">

            <h2 className="text-2xl font-bold">
              Reference Verification
            </h2>

            <p className="text-slate-500 mt-2">
              References are checked using scholarly metadata.
            </p>


            <div className="grid sm:grid-cols-4 gap-4 mt-6">

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
                label="Possible"
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

          </div>


          {/* JOURNALS */}

          <div className="bg-white border border-slate-200 rounded-3xl p-8 mt-8">

            <h2 className="text-2xl font-bold">
              Journal Recommendations
            </h2>

            <p className="text-slate-500 mt-2">
              Recommendations are based on topic relevance and do not predict acceptance.
            </p>


            {journals.length > 0 ? (
              <div className="grid lg:grid-cols-2 gap-5 mt-6">

                {journals.map(
                  (journal, index) => (
                    <div
                      key={index}
                      className="border border-slate-200 rounded-2xl p-5"
                    >

                      <p className="font-bold text-lg">
                        {journal.journal_name ||
                          journal.name ||
                          "Journal"}
                      </p>


                      {journal.publisher && (
                        <p className="text-sm text-slate-500 mt-2">
                          {journal.publisher}
                        </p>
                      )}


                      {journal.relevance_score !=
                        null && (
                        <>
                          <p className="text-blue-600 text-3xl font-bold mt-4">
                            {journal.relevance_score}%
                          </p>

                          <p className="text-xs text-slate-500">
                            Topic relevance
                          </p>
                        </>
                      )}

                    </div>
                  )
                )}

              </div>
            ) : (
              <p className="text-slate-500 mt-6">
                No journal matches available.
              </p>
            )}

          </div>


          {/* PREVIEW */}

          {result.text_preview && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 mt-8">

              <h2 className="text-2xl font-bold">
                Manuscript Preview
              </h2>

              <div className="bg-slate-50 rounded-xl p-5 mt-5 max-h-80 overflow-y-auto">

                <p className="whitespace-pre-wrap text-sm text-slate-700 leading-7">
                  {result.text_preview}
                </p>

              </div>

            </div>
          )}

        </main>

      </div>
    );
  }


  // ============================================================
  // UPLOAD PAGE
  // ============================================================

  if (page === "upload") {
    return (
      <div className="min-h-screen bg-slate-50">

        <main className="max-w-5xl mx-auto px-6 py-12">

          <div className="text-center">

            <p className="text-blue-600 font-bold">
              NEW ANALYSIS
            </p>

            <h1 className="text-4xl md:text-5xl font-bold mt-3">
              Upload Your Research Manuscript
            </h1>

            <p className="text-slate-500 mt-4">
              Upload PDF or DOCX files up to 20 MB.
            </p>

          </div>


          <div className="mt-10">

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
              className={`border-2 border-dashed rounded-3xl p-12 md:p-16 text-center cursor-pointer transition ${
                dragging
                  ? "border-blue-600 bg-blue-50"
                  : "border-blue-400 bg-white"
              }`}
            >

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />


              <div className="w-20 h-20 bg-blue-100 rounded-2xl mx-auto flex items-center justify-center text-4xl">
                📄
              </div>


              <h2 className="text-2xl md:text-3xl font-bold mt-7">
                Drag & drop your manuscript
              </h2>


              <p className="text-slate-500 text-lg mt-3">
                or click to browse your computer
              </p>


              <button
                type="button"
                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold mt-7"
              >
                Choose File
              </button>


              <p className="text-slate-400 mt-6">
                PDF or DOCX • Maximum 20 MB
              </p>

            </div>


            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-5 mt-6 text-lg">
                {error}
              </div>
            )}


            {selectedFile && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 mt-7 flex justify-between items-center gap-5">

                <div className="flex items-center gap-4">

                  <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
                    📑
                  </div>


                  <div>

                    <p className="font-bold text-lg">
                      {selectedFile.name}
                    </p>

                    <p className="text-slate-500 mt-1">
                      {formatFileSize(
                        selectedFile.size
                      )}
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();

                    removeFile();
                  }}
                  className="text-red-500"
                >
                  Remove
                </button>

              </div>
            )}


            {/* PIPELINE */}

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-8">

              {[
                "Extract",
                "Structure",
                "AI Review",
                "References",
                "Journal Match",
                "Report",
              ].map(
                (step, index) => (
                  <div
                    key={step}
                    className="bg-white rounded-xl p-4 text-center border border-slate-100"
                  >

                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold mx-auto flex items-center justify-center">
                      {index + 1}
                    </div>

                    <p className="text-sm mt-3">
                      {step}
                    </p>

                  </div>
                )
              )}

            </div>


            <button
              type="button"
              disabled={
                !selectedFile ||
                analyzing
              }
              onClick={
                analyzeManuscript
              }
              className={`w-full py-5 rounded-xl font-bold text-xl mt-8 ${
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

          </div>

        </main>

      </div>
    );
  }


  // ============================================================
  // HOME PAGE
  // ============================================================

  return (
    <div className="min-h-screen bg-white">

      <section className="min-h-[80vh] bg-gradient-to-b from-blue-50 to-white flex items-center px-6">

        <div className="max-w-5xl mx-auto text-center py-20">

          <p className="inline-flex bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-semibold">
            ✨ AI-Powered Research Assistant
          </p>

          <h1 className="text-4xl md:text-7xl font-bold leading-tight mt-7">

            Make Your Research{" "}

            <span className="text-blue-600">
              Journal-Ready
            </span>

          </h1>


          <p className="text-lg md:text-xl text-slate-600 leading-8 max-w-3xl mx-auto mt-6">
            Analyze manuscript quality, verify references, discover relevant journals and generate a professional readiness report.
          </p>


          <button
            type="button"
            onClick={openUploadPage}
            className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg mt-9"
          >
            Analyze My Manuscript
          </button>

        </div>

      </section>

    </div>
  );
}


// ============================================================
// SMALL COMPONENTS
// ============================================================

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
    <div className="bg-slate-50 rounded-xl p-4">

      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="text-2xl font-bold mt-1">
        {value}
      </p>

    </div>
  );
}


export default ResearchWorkspace;