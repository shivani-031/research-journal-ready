import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  User,
  FileText,
  Sparkles,
  RefreshCw,
  BookOpen,
  AlertCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";


// ============================================================
// BACKEND URL
// Local:
//   http://127.0.0.1:8000
//
// Production:
//   VITE_API_BASE_URL from Vercel
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";


// ============================================================
// CHAT PAGE
// ============================================================

function ChatPage({ user }) {
  const [manuscripts, setManuscripts] = useState([]);

  const [selectedManuscriptId, setSelectedManuscriptId] =
    useState("");

  const [loadingManuscripts, setLoadingManuscripts] =
    useState(true);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "Hi! I'm your ResearchReady AI assistant. Ask me about research writing, methodology, citations, references, journals, or select one of your saved manuscripts for paper-specific help.",
    },
  ]);

  const [input, setInput] = useState("");

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);


  // ============================================================
  // LOAD MANUSCRIPTS FROM SUPABASE
  // ============================================================

  useEffect(() => {
    const loadManuscripts = async () => {
      if (!user?.id) {
        setLoadingManuscripts(false);
        return;
      }

      try {
        const { data, error: loadError } =
          await supabase
            .from("manuscripts")
            .select(
              "id,file_name,analysis_result,created_at"
            )
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            });

        if (loadError) {
          throw loadError;
        }

        setManuscripts(data || []);
      } catch (err) {
        console.error(
          "Could not load manuscripts:",
          err
        );
      } finally {
        setLoadingManuscripts(false);
      }
    };

    loadManuscripts();
  }, [user]);


  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, sending]);


  // ============================================================
  // SELECTED MANUSCRIPT
  // ============================================================

  const selectedManuscript =
    manuscripts.find(
      (item) =>
        String(item.id) ===
        String(selectedManuscriptId)
    ) || null;


  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = async (customText = null) => {
    const question = (customText ?? input).trim();

    if (!question || sending) {
      return;
    }

    setError("");

    const userMessage = {
      role: "user",
      text: question,
    };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);

    setInput("");

    setSending(true);

    try {
      console.log(
        "CHAT API:",
        `${API_BASE_URL}/chat`
      );

      const response = await fetch(
        `${API_BASE_URL}/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            messages: nextMessages,

            context:
              selectedManuscript?.analysis_result ||
              null,
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            `AI request failed (${response.status})`
        );
      }

      if (!data?.reply) {
        throw new Error(
          "AI returned an empty response."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.reply,
        },
      ]);
    } catch (err) {
      console.error(
        "Chat request error:",
        err
      );

      if (err.message === "Failed to fetch") {
        setError(
          "Could not connect to the ResearchReady backend."
        );
      } else {
        setError(
          err.message ||
            "AI chat failed."
        );
      }
    } finally {
      setSending(false);
    }
  };


  // ============================================================
  // ENTER TO SEND
  // ============================================================

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };


  // ============================================================
  // RESET CHAT
  // ============================================================

  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        text:
          "Hi! I'm your ResearchReady AI assistant. Ask me about research writing, methodology, citations, references, journals, or select one of your saved manuscripts for paper-specific help.",
      },
    ]);

    setInput("");
    setError("");
  };


  // ============================================================
  // QUICK PROMPTS
  // ============================================================

  const quickPrompts = [
    {
      title: "Improve Methodology",
      text:
        "How can I improve my methodology?",
    },

    {
      title: "Improve Abstract",
      text:
        "How can I improve the abstract of my research paper?",
    },

    {
      title: "Check References",
      text:
        "What should I check in my research paper references?",
    },

    {
      title: "Journal Selection",
      text:
        "How should I choose a suitable journal for my research paper?",
    },
  ];


  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 px-6 md:px-10 lg:px-14 py-10">

      <div className="max-w-6xl mx-auto">


        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

          <div>

            <p className="text-blue-600 text-sm font-bold tracking-wide">
              AI RESEARCH ASSISTANT
            </p>

            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">
              AI Research Chat
            </h1>

            <p className="text-slate-500 mt-2 max-w-2xl">
              Ask research questions or use one of your saved manuscripts for paper-specific help.
            </p>

          </div>


          <button
            type="button"
            onClick={resetChat}
            className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-5 py-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={18} />

            New Chat
          </button>

        </div>


        {/* MANUSCRIPT CONTEXT */}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-8">

          <div className="flex items-start gap-3">

            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">

              <FileText size={19} />

            </div>


            <div className="flex-1">

              <p className="font-bold text-slate-900">
                Manuscript Context
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Select a saved manuscript for paper-specific AI assistance.
              </p>


              <select
                value={selectedManuscriptId}
                onChange={(event) =>
                  setSelectedManuscriptId(
                    event.target.value
                  )
                }
                disabled={loadingManuscripts}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 mt-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
              >

                <option value="">
                  No manuscript selected
                </option>

                {manuscripts.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.file_name}
                  </option>
                ))}

              </select>


              {selectedManuscript && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-3">

                  <p className="text-sm text-blue-700">

                    Using manuscript:{" "}

                    <span className="font-semibold">
                      {selectedManuscript.file_name}
                    </span>

                  </p>

                </div>
              )}

            </div>

          </div>

        </div>


        {/* QUICK PROMPTS */}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">

          {quickPrompts.map((prompt) => (
            <button
              key={prompt.title}
              type="button"
              disabled={sending}
              onClick={() =>
                sendMessage(prompt.text)
              }
              className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 transition"
            >

              <Sparkles
                size={17}
                className="text-blue-600"
              />

              <p className="font-semibold text-sm mt-3">
                {prompt.title}
              </p>

            </button>
          ))}

        </div>


        {/* CHAT CONTAINER */}

        <div className="bg-white border border-slate-200 rounded-3xl mt-6 overflow-hidden">


          {/* CHAT HEADER */}

          <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-3">

            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">

              <Bot size={21} />

            </div>

            <div>

              <p className="font-bold">
                ResearchReady AI
              </p>

              <p className="text-xs text-slate-500">
                Academic research assistant
              </p>

            </div>

          </div>


          {/* MESSAGES */}

          <div className="min-h-[480px] max-h-[65vh] overflow-y-auto px-6 py-7">

            <div className="space-y-7">

              {messages.map(
                (message, index) => {
                  const isUser =
                    message.role === "user";

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
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">

                          <Bot size={20} />

                        </div>
                      )}


                      <div
                        className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                          isUser
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-slate-100 text-slate-800 rounded-bl-md"
                        }`}
                      >

                        <p className="whitespace-pre-wrap leading-7">
                          {message.text}
                        </p>

                      </div>


                      {isUser && (
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">

                          <User size={20} />

                        </div>
                      )}

                    </div>
                  );
                }
              )}


              {sending && (
                <div className="flex gap-3">

                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">

                    <Bot size={20} />

                  </div>

                  <div className="bg-slate-100 px-5 py-4 rounded-2xl rounded-bl-md">

                    <div className="flex items-center gap-2">

                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />

                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />

                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />

                    </div>

                  </div>

                </div>
              )}


              <div ref={messagesEndRef} />

            </div>

          </div>


          {/* ERROR */}

          {error && (
            <div className="mx-6 mb-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">

              <AlertCircle
                size={19}
                className="shrink-0 mt-0.5"
              />

              <p>
                {error}
              </p>

            </div>
          )}


          {/* INPUT */}

          <div className="border-t border-slate-200 p-5">

            <div className="flex gap-3 items-end">

              <textarea
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask your research question..."
                rows={2}
                className="flex-1 resize-none border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />


              <button
                type="button"
                onClick={() =>
                  sendMessage()
                }
                disabled={
                  !input.trim() ||
                  sending
                }
                className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  input.trim() &&
                  !sending
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >

                <Send size={21} />

              </button>

            </div>


            <div className="flex items-start gap-2 text-xs text-slate-400 mt-4">

              <BookOpen
                size={14}
                className="shrink-0 mt-0.5"
              />

              <p>
                AI responses may contain errors. Verify important research, citation and journal information before using it.
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default ChatPage;