import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { askTutor } from "@/lib/ai-tutor.functions";
import { transcribeAudio } from "@/lib/stt.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, Mic, MicOff, Volume2, VolumeX, Loader2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

type Msg = { role: "user" | "assistant"; content: string };

export function FloatingTutor() {
  const { t } = useI18n();
  const onTutorPage = useRouterState({ select: state => state.location.pathname.startsWith("/tutor") });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: t("ui.tutorGreeting") },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const ask = useServerFn(askTutor);
  const stt = useServerFn(transcribeAudio);

  const mutation = useMutation({
    mutationFn: (msgs: Msg[]) => ask({ data: { messages: msgs } }),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      if (ttsOn && typeof window !== "undefined" && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(res.reply);
        u.lang = "sq-AL";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    },
    onError: (e: Error) => toast.error(e?.message ?? t("ui.tutorError")),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, mutation.isPending]);

  function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || mutation.isPending) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    mutation.mutate(next);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) return;
        setTranscribing(true);
        try {
          const buf = await blob.arrayBuffer();
          let bin = "";
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
          const b64 = btoa(bin);
          const res = await stt({ data: { audioBase64: b64, mimeType: "audio/webm" } });
          if (res.text) send(res.text);
          else toast.error(t("ui.tutorNoText"));
        } catch (e) {
          toast.error((e instanceof Error ? e.message : t("ui.tutorTranscribeFail")));
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      toast.error(t("ui.tutorMicDenied"));
    }
  }

  function toggleMic() {
    if (listening) {
      recorderRef.current?.stop();
      recorderRef.current = null;
      setListening(false);
    } else {
      startRecording();
    }
  }

  if (onTutorPage) return null;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-50 size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition flex items-center justify-center"
            aria-label={t("ui.tutorOpenAria")}
          >
            <MessageCircle className="size-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100dvh-2rem))] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <GraduationCap className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{t("ui.tutorTitle")}</div>
                  <div className="text-[10px] text-muted-foreground">Uendi Platform</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="size-8" onClick={() => setTtsOn(!ttsOn)} title={ttsOn ? t("ui.tutorMuteOn") : t("ui.tutorMuteOff")}>
                  {ttsOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="size-8" aria-label={t("crm2.cancel")} onClick={() => setOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {mutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="size-3 animate-spin" /> {t("ui.tutorThinking")}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-border p-2 flex items-center gap-1">
              <Button size="icon" variant={listening ? "default" : "ghost"} className="size-9 shrink-0" onClick={toggleMic} title={t("ui.tutorMicHint")}>
                {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={listening ? t("ui.tutorListening") : transcribing ? t("ui.tutorTranscribing") : t("ui.tutorTypeOrSpeak")}
                disabled={mutation.isPending || transcribing}
                className="h-9"
              />
              <Button size="icon" className="size-9 shrink-0" onClick={() => send()} disabled={mutation.isPending || !input.trim()}>
                <Send className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
