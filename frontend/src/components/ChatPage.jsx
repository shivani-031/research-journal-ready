import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bot,
  Send,
  User,
  FileText,
  Sparkles,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function ChatPage({
  user,
}) {
  const [
    messages,
    setMessages,
  ] = useState([
    {
      role: "assistant",

      text:
        "Hi! I'm your ResearchReady AI assistant. Ask me about research writing, methodology, citations, references, journals, or select one of your saved manuscripts for paper-specific help.",
    },
  ]);

  const [
    input,
    setInput,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    manuscripts,
    setManuscripts,
  ] = useState([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const bottomRef =
    useRef(null);

  // =========================================================
  // LOAD USER LIBRARY
  // =========================================================

  useEffect(() => {
    const loadManuscripts =
      async () => {
        if (!user?.id) {
          return;
        }

        const {
          data,
          error:
            manuscriptError,
        } =
          await supabase
            .from("manuscripts")
            .select(
              "id,file_name,analysis_result,created_at"
            )
            .eq(
              "user_id",
              user.id
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(20);

        if (manuscriptError) {
          console.error(
            manuscriptError
          );

          return;
        }

        setManuscripts(
          data || []
        );
      };

    loadManuscripts();
  }, [user?.id]);

  // =========================================================
  // AUTO SCROLL
  // =========================================================

  useEffect(() => {
    bottomRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }, [
    messages,
    loading,
  ]);

  // =========================================================
  // SELECTED MANUSCRIPT
  // =========================================================

  const selectedManuscript =
    manuscripts.find(
      (manuscript) =>
        manuscript.id ===
        selectedId
    );

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const sendMessage =
    async () => {
      const question =
        input.trim();

      if (
        !question ||
        loading
      ) {
        return;
      }

      const userMessage = {
        role: "user",
        text: question,
      };

      const nextMessages = [
        ...messages,
        userMessage,
      ];

      setMessages(
        nextMessages
      );

      setInput("");
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "http://127.0.0.1:8000/chat",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  messages:
                    nextMessages,

                  context:
                    selectedManuscript
                      ?.analysis_result ||
                    null,
                }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "AI chat failed."
          );
        }

        setMessages(
          (current) => [
            ...current,

            {
              role:
                "assistant",

              text:
                data.reply,
            },
          ]
        );
      } catch (err) {
        setError(
          err.message ||
            "Could not connect to AI chat."
        );
      } finally {
        setLoading(false);
      }
    };

  // =========================================================
  // ENTER TO SEND
  // =========================================================

  const handleKeyDown =
    (event) => {
      if (
        event.key ===
          "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        sendMessage();
      }
    };

  // =========================================================
  // QUICK QUESTION
  // =========================================================

  const handleQuickQuestion = (question) => {
    setInput(question);
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50">

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">

        {/* HEADER */}

        <div>

          <p className="text-blue-600 font-bold text-sm tracking-wide">
            RESEARCH ASSISTANT
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">
            AI Research Chat
          </h1>

          <p className="text-slate-500 mt-2">
            Ask research questions or chat about one of your analyzed manuscripts.
          </p>

        </div>

        {/* MANUSCRIPT SELECTOR */}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-7">

          <div className="flex flex-col lg:flex-row lg:items-center gap-4">

            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

              <FileText
                size={21}
              />

            </div>

            <div className="flex-1">

              <p className="font-semibold text-slate-900">
                Manuscript Context
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Select a saved paper if your question is related to a specific manuscript.
              </p>

            </div>

            <select
              value={
                selectedId
              }
              onChange={(event) =>
                setSelectedId(
                  event.target.value
                )
              }
              className="border border-slate-300 rounded-xl px-4 py-3 bg-white outline-none focus:border-blue-500 lg:max-w-sm"
            >

              <option value="">
                General research chat
              </option>

              {manuscripts.map(
                (manuscript) => (
                  <option
                    key={
                      manuscript.id
                    }
                    value={
                      manuscript.id
                    }
                  >
                    {
                      manuscript.file_name
                    }
                  </option>
                )
              )}

            </select>

          </div>

          {selectedManuscript && (

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mt-4">

              <p className="text-sm text-blue-700">
                AI is using{" "}
                <strong>
                  {
                    selectedManuscript.file_name
                  }
                </strong>{" "}
                as manuscript context.
              </p>

            </div>

          )}

        </div>

        {/* QUICK QUESTIONS */}

        <div className="flex flex-wrap gap-3 mt-5">

          <QuickButton
            text="How can I improve my methodology?"
            onClick={() =>
              handleQuickQuestion(
                "How can I improve my methodology?"
              )
            }
          />

          <QuickButton
            text="Explain my weaknesses"
            onClick={() =>
              handleQuickQuestion(
                "Explain the main weaknesses in my manuscript."
              )
            }
          />

          <QuickButton
            text="Help with references"
            onClick={() =>
              handleQuickQuestion(
                "Which references need attention and why?"
              )
            }
          />

          <QuickButton
            text="Explain journal matches"
            onClick={() =>
              handleQuickQuestion(
                "Explain why these journals were recommended."
              )
            }
          />

        </div>

        {/* CHAT BOX */}

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden mt-7">

          {/* CHAT HEADER */}

          <div className="border-b border-slate-200 p-5 flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">

              <Sparkles
                size={20}
              />

            </div>

            <div>

              <p className="font-bold text-slate-900">
                ResearchReady AI
              </p>

              <p className="text-xs text-green-600 font-semibold">
                ● AI Assistant Ready
              </p>

            </div>

          </div>

          {/* MESSAGES */}

          <div className="h-[500px] overflow-y-auto p-6 space-y-6">

            {messages.map(
              (
                message,
                index
              ) => {
                const isUser =
                  message.role ===
                  "user";

                return (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      isUser
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >

                    {!isUser && (

                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">

                        <Bot
                          size={18}
                        />

                      </div>

                    )}

                    <div
                      className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                        isUser
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-slate-100 text-slate-700 rounded-bl-md"
                      }`}
                    >

                      <p className="whitespace-pre-wrap leading-7 text-sm">
                        {
                          message.text
                        }
                      </p>

                    </div>

                    {isUser && (

                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">

                        <User
                          size={18}
                        />

                      </div>

                    )}

                  </div>
                );
              }
            )}

            {/* THINKING */}

            {loading && (

              <div className="flex gap-3">

                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">

                  <Bot
                    size={18}
                  />

                </div>

                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-5 py-4 text-slate-500 text-sm">
                  Thinking...
                </div>

              </div>

            )}

            <div
              ref={bottomRef}
            />

          </div>

          {/* ERROR */}

          {error && (

            <div className="mx-5 mb-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>

          )}

          {/* INPUT */}

          <div className="border-t border-slate-200 p-4">

            <div className="flex items-end gap-3">

              <textarea
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                rows={2}
                placeholder="Ask your research question..."
                className="flex-1 resize-none border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={
                  loading ||
                  !input.trim()
                }
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  loading ||
                  !input.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >

                <Send
                  size={20}
                />

              </button>

            </div>

            <p className="text-xs text-slate-400 mt-3">
              AI responses may contain errors. Verify important research, citation and journal information before using it.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

// =========================================================
// QUICK BUTTON
// =========================================================

function QuickButton({
  text,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
    >
      {text}
    </button>
  );
}

export default ChatPage;