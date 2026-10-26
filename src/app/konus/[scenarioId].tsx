import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { aiChat, aiScenarios, aiStatus, AiError, type AiScenario } from '@/data/remote/ai';
import type { LangCode } from '@/domain';
import { historyFor, type ConversationMessage } from '@/features/conversation/history';
import { SpeakerButton } from '@/features/lesson/exercises/Prompt';
import { useAppStore } from '@/features/store';
import { useSpeechRecognition } from '@/speech';
import { Body, Button, Caption, Heading, Screen, radii, spacing, useTheme } from '@/ui';

const MAX_MESSAGE = 500;
const LIMIT_MESSAGE = 'Bugünlük konuşma hakkın doldu. Yarın tekrar gel!';
const PRIVACY_NOTE = 'Konuşmaların kaydedilmez; yapay zekâ hata yapabilir. Kişisel bilgilerini (ad, adres, telefon) yazma.';

type Params = { scenarioId: string };

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; scenario: AiScenario; remaining: number | null; limit: number };

/**
 * AI conversation practice chat (roadmap item 6), pushed from the "Konuş" tab.
 * The scenario opener seeds the thread; every user message goes to the server
 * with the full previous history (trimmed to 20 turns). Assistant replies are
 * speakable in the course's target language with an optional Turkish
 * translation; corrections render under the user's bubble. A 429 exhausts the
 * day, a 502/network failure offers a retry that keeps the failed message.
 * When the server marks the scenario done, a celebration awards XP once.
 */
export default function ConversationScreen() {
  const { scenarioId } = useLocalSearchParams<Params>();
  const { colors } = useTheme();
  const course = useAppStore((s) => s.course);
  const finishConversation = useAppStore((s) => s.finishConversation);
  const lang: LangCode = course.toLang;

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  // Bumped by the retry button to re-run the fetch below (event handler, not an effect).
  const [reloadKey, setReloadKey] = useState(0);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [done, setDone] = useState(false);
  const [showTr, setShowTr] = useState<Record<number, boolean>>({});
  // The failed send stays recoverable: retry re-sends the exact same payload
  // without appending the user turn a second time.
  const pendingRef = useRef<{ text: string; history: ReturnType<typeof historyFor> } | null>(null);
  // finishConversation fires at most once per visit, mirroring the story screen.
  const finishStartedRef = useRef(false);

  const stt = useSpeechRecognition(lang);
  const lastTranscriptRef = useRef('');
  useEffect(() => {
    if (stt.status === 'done' && stt.transcript && stt.transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = stt.transcript;
      setInput((v) => (v ? `${v} ${stt.transcript}` : stt.transcript));
    }
  }, [stt.status, stt.transcript]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [status, scenarios] = await Promise.all([aiStatus(), aiScenarios(course.id)]);
        if (!alive) return;
        const scenario = scenarios.find((s) => s.id === scenarioId);
        if (!scenario) {
          setState({ kind: 'error', message: 'Senaryo bulunamadı. Lütfen listeden yeniden seç.' });
          return;
        }
        setMessages([{ role: 'assistant', text: scenario.opener }]);
        setState({ kind: 'ready', scenario, remaining: status.remaining, limit: status.limit });
      } catch (e) {
        if (alive) setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      alive = false;
    };
  }, [course.id, scenarioId, reloadKey]);

  const send = useCallback(
    async (text: string, history: ReturnType<typeof historyFor>) => {
      setWaiting(true);
      setErrorMsg(null);
      setCanRetry(false);
      try {
        const res = await aiChat({ courseId: course.id, scenarioId, history, message: text });
        setMessages((prev) => [
          ...prev,
          { role: 'user', text, correction: res.correction },
          { role: 'assistant', text: res.reply, replyTr: res.replyTr },
        ]);
        setState((s) => (s.kind === 'ready' ? { ...s, remaining: res.remaining } : s));
        if (res.done && !finishStartedRef.current) {
          finishStartedRef.current = true;
          setDone(true);
          void finishConversation(scenarioId);
        }
      } catch (e) {
        if (e instanceof AiError && e.code === 'limit') {
          setLimitHit(true);
        } else if (e instanceof AiError && (e.code === 'upstream' || e.code === 'network')) {
          pendingRef.current = { text, history };
          setErrorMsg(e.message);
          setCanRetry(true);
        } else {
          setErrorMsg(e instanceof Error ? e.message : String(e));
        }
      } finally {
        setWaiting(false);
      }
    },
    [course.id, scenarioId, finishConversation],
  );

  const onSend = useCallback(() => {
    const text = input.trim();
    if (!text || waiting || limitHit || done) return;
    const history = historyFor(messages);
    pendingRef.current = { text, history };
    setInput('');
    void send(text, history);
  }, [input, waiting, limitHit, done, messages, send]);

  const onRetry = useCallback(() => {
    const pending = pendingRef.current;
    if (pending && !waiting) void send(pending.text, pending.history);
  }, [send, waiting]);

  const micAvailable = stt.status !== 'unavailable';
  const inputDisabled = waiting || limitHit || done || state.kind !== 'ready';

  return (
    <Screen padding={0} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {state.kind === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" accessibilityLabel="Yükleniyor" />
          </View>
        ) : state.kind === 'error' ? (
          <View style={[styles.center, styles.errorBody]}>
            <Body color={colors.dangerText}>{state.message}</Body>
            <Button
              title="Tekrar dene"
              variant="outline"
              onPress={() => {
                setState({ kind: 'loading' });
                setReloadKey((k) => k + 1);
              }}
            />
            <Button title="Geri" variant="outline" onPress={() => router.back()} />
          </View>
        ) : (
          <>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerText}>
                <Heading accessibilityRole="header" numberOfLines={1}>
                  {state.scenario.titleTr}
                </Heading>
                <Caption color={colors.textMuted} numberOfLines={1}>
                  Hedef: {state.scenario.goalTr}
                  {state.remaining !== null ? ` • Bugün kalan: ${state.remaining}/${state.limit}` : ''}
                </Caption>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kapat"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.close, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.thread}>
              {messages.map((m, i) =>
                m.role === 'assistant' ? (
                  <View key={i} style={[styles.bubble, styles.assistant, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.assistantRow}>
                      <SpeakerButton text={m.text} lang={lang} />
                      <Body style={styles.bubbleText}>{m.text}</Body>
                    </View>
                    {m.replyTr ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={showTr[i] ? 'Türkçesini gizle' : 'Türkçesi'}
                        onPress={() => setShowTr((prev) => ({ ...prev, [i]: !prev[i] }))}
                        style={({ pressed }) => [styles.trToggle, { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                      >
                        <Caption color={colors.primaryText}>{showTr[i] ? 'Türkçesini gizle' : 'Türkçesi'}</Caption>
                      </Pressable>
                    ) : null}
                    {m.replyTr && showTr[i] ? <Body color={colors.textMuted}>{m.replyTr}</Body> : null}
                  </View>
                ) : (
                  <View key={i} style={styles.userWrap}>
                    <View style={[styles.bubble, styles.user, { backgroundColor: colors.primaryTint }]}>
                      <Body style={styles.bubbleText}>{m.text}</Body>
                    </View>
                    {m.correction ? (
                      <View style={[styles.correction, { borderColor: colors.success, backgroundColor: colors.successTint }]}>
                        <Caption color={colors.successText}>DÜZELTME</Caption>
                        <Text style={[styles.original, { color: colors.textMuted }]}>{m.correction.original}</Text>
                        <Body color={colors.successText}>{m.correction.corrected}</Body>
                        <Caption color={colors.textMuted}>{m.correction.explanationTr}</Caption>
                      </View>
                    ) : null}
                  </View>
                ),
              )}
              {waiting ? (
                <View style={[styles.bubble, styles.assistant, styles.typing, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Caption color={colors.textMuted}>yazıyor…</Caption>
                </View>
              ) : null}
              {limitHit ? (
                <View style={[styles.notice, { borderColor: colors.warning, backgroundColor: colors.surface }]}>
                  <Body>{LIMIT_MESSAGE}</Body>
                </View>
              ) : null}
              {errorMsg ? (
                <View style={[styles.notice, { borderColor: colors.danger, backgroundColor: colors.surface }]}>
                  <Body color={colors.dangerText}>{errorMsg}</Body>
                  {canRetry ? <Button title="Tekrar dene" variant="outline" block={false} onPress={onRetry} /> : null}
                </View>
              ) : null}
              {done ? (
                <View style={[styles.doneCard, { borderColor: colors.success, backgroundColor: colors.successTint }]}>
                  <Text style={styles.doneEmoji} accessible={false}>
                    🎉
                  </Text>
                  <Heading center>Görev tamam!</Heading>
                  <Body color={colors.textMuted} center>
                    Senaryoyu başarıyla tamamladın. +10 XP kazandın!
                  </Body>
                  <Button title="Yeni senaryo" onPress={() => router.push('/konus')} />
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.inputBar, { borderTopColor: colors.border }]}>
              {micAvailable ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={stt.status === 'listening' ? 'Mikrofonu durdur' : 'Mikrofonla konuş'}
                  accessibilityState={{ busy: stt.status === 'listening' }}
                  onPress={() => (stt.status === 'listening' ? stt.stop() : void stt.start())}
                  style={({ pressed }) => [
                    styles.mic,
                    {
                      borderColor: stt.status === 'listening' ? colors.danger : colors.borderStrong,
                      backgroundColor: stt.status === 'listening' ? colors.dangerTint : colors.surface,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={styles.micGlyph} accessible={false}>
                    {stt.status === 'listening' ? '⏹' : '🎤'}
                  </Text>
                </Pressable>
              ) : null}
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Mesajını yaz…"
                placeholderTextColor={colors.textMuted}
                maxLength={MAX_MESSAGE}
                editable={!inputDisabled}
                multiline
                accessibilityLabel="Mesajın"
                style={[styles.input, { borderColor: colors.borderStrong, color: colors.text, backgroundColor: colors.surface }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gönder"
                accessibilityState={{ disabled: inputDisabled || input.trim().length === 0 }}
                disabled={inputDisabled || input.trim().length === 0}
                onPress={onSend}
                style={({ pressed }) => [
                  styles.send,
                  { backgroundColor: colors.primary, opacity: pressed || inputDisabled || !input.trim() ? 0.5 : 1 },
                ]}
              >
                <Text style={[styles.sendGlyph, { color: colors.buttonPrimaryText }]} accessible={false}>
                  ➤
                </Text>
              </Pressable>
            </View>
            <Caption color={colors.textMuted} style={styles.counter}>
              {input.length}/{MAX_MESSAGE}
            </Caption>
            <Caption color={colors.textMuted} style={styles.privacy}>
              {PRIVACY_NOTE}
            </Caption>
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  errorBody: { justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerText: { flex: 1, gap: 2 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20 },
  thread: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  bubble: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, maxWidth: '88%', gap: spacing.sm },
  assistant: { alignSelf: 'flex-start' },
  userWrap: { alignSelf: 'flex-end', maxWidth: '88%', gap: spacing.sm },
  user: { alignSelf: 'flex-end', borderColor: 'transparent' },
  bubbleText: { flexShrink: 1 },
  assistantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trToggle: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  typing: { minWidth: 72, alignItems: 'center' },
  correction: { borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, gap: 2 },
  original: { textDecorationLine: 'line-through' },
  notice: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
  doneCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm, alignItems: 'center' },
  doneEmoji: { fontSize: 40 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1 },
  mic: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micGlyph: { fontSize: 20 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 12, fontSize: 16 },
  send: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  sendGlyph: { fontSize: 20 },
  counter: { alignSelf: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: 2 },
  privacy: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
});
