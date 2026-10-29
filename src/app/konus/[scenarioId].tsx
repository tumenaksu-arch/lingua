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
import { CharacterCard } from '@/features/conversation/CharacterCard';
import { characterFor } from '@/features/conversation/character';
import { ChatThread } from '@/features/conversation/ChatThread';
import { historyFor, type ConversationMessage } from '@/features/conversation/history';
import { useAppStore } from '@/features/store';
import { speak, stopSpeaking, useSpeechRecognition } from '@/speech';
import { Body, Button, Caption, Heading, Screen, radii, showAlert, spacing, useSettingsStore, useTheme } from '@/ui';

const MAX_MESSAGE = 500;
const LIMIT_MESSAGE = 'Bugünlük konuşma hakkın doldu. Yarın tekrar gel!';
const PRIVACY_NOTE = 'Konuşmaların kaydedilmez; yapay zekâ hata yapabilir. Kişisel bilgilerini (ad, adres, telefon) yazma.';
const MIC_UNAVAILABLE_MESSAGE =
  'Mikrofona erişilemiyor. Konuşma tanıma bu cihazda kullanılamıyor ya da mikrofon izni reddedilmiş olabilir; istersen yazılı moda geçebilirsin.';

type Params = { scenarioId: string };

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'disabled' } // server flag off: "yakında" kartı (sekmenin aynası)
  | { kind: 'ready'; scenario: AiScenario; remaining: number | null; limit: number };

/**
 * AI conversation practice chat (roadmap item 6), pushed from the "Konuş" tab.
 * The scenario opener seeds the thread; every user message goes to the server
 * with the full previous history (trimmed to 20 turns). Assistant replies are
 * speakable in the course's target language with an optional Turkish
 * translation; corrections render under the user's bubble. A 429 exhausts the
 * day, a 502/network failure offers a retry that keeps the failed message.
 * When the server marks the scenario done, a celebration awards XP once.
 *
 * İki giriş modu vardır (tercih `settingsStore`'da hatırlanır): yazılı mod
 * klavye + mikrofon-dikte girişi sunar; sesli mod (Video Call benzeri) büyük
 * bir mikrofon düğmesiyle çalışır — konuşma bitince transkript otomatik
 * gönderilir, yanıt hedef dilde otomatik seslendirilir ve karakter kartı
 * konuşurken nabız animasyonu oynatır. Seslendirme bitince mikrofon kendiliğinden
 * açılmaz; yanlışlıkla kayıt başlamasın diye kullanıcı düğmeye basar.
 */
export default function ConversationScreen() {
  const { scenarioId } = useLocalSearchParams<Params>();
  const { colors } = useTheme();
  const user = useAppStore((s) => s.user);
  const course = useAppStore((s) => s.course);
  const finishConversation = useAppStore((s) => s.finishConversation);
  const lang: LangCode = course.toLang;
  const konusMode = useSettingsStore((s) => s.konusMode);
  const setKonusMode = useSettingsStore((s) => s.setKonusMode);
  const voiceMode = konusMode === 'sesli';

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
  // XP satırı yalnızca finishConversation ÇÖZÜMLENDİĞİNDE gösterilir: reddedilen
  // bir kayıt vaat edilmiş XP göstermez.
  const [xpSaved, setXpSaved] = useState(false);
  const [showTr, setShowTr] = useState<Record<number, boolean>>({});
  // Sesli modda düzeltme kartları başlangıçta katlıdır ("Düzeltmeyi göster").
  const [showCorr, setShowCorr] = useState<Record<number, boolean>>({});
  // AI yanıtının seslendirilmesi sürüyor mu; düğme bu sırada "Durdur" olur.
  const [speaking, setSpeaking] = useState(false);
  // The failed send stays recoverable: retry re-sends the exact same payload
  // without appending the user turn a second time.
  const pendingRef = useRef<{ text: string; history: ReturnType<typeof historyFor> } | null>(null);
  // finishConversation fires at most once per visit, mirroring the story screen.
  const finishStartedRef = useRef(false);
  // Transkript otomatik gönderiminde güncel iş parçacığı gerekir (stale kapanma olmasın).
  const messagesRef = useRef(messages);

  const stt = useSpeechRecognition(lang);
  const lastTranscriptRef = useRef('');

  // Ekrandan çıkarken açık kalan seslendirme kapatılır.
  useEffect(() => {
    return () => {
      void stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!user) return; // konuk: ağa çıkılmaz, giriş CTA'sı gösterilir
    let alive = true;
    void (async () => {
      try {
        const [status, scenarios] = await Promise.all([aiStatus(), aiScenarios(course.id)]);
        if (!alive) return;
        if (!status.enabled) {
          setState({ kind: 'disabled' });
          return;
        }
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
  }, [user, course.id, scenarioId, reloadKey]);

  const speakReply = useCallback(
    (text: string) => {
      setSpeaking(true);
      void speak(text, lang, {
        onDone: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    },
    [lang],
  );

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
        // Sesli modda yanıt hedef dilde otomatik seslendirilir (sunucu doğal
        // sesi / cihaz yedeği tts.ts içinde seçilir).
        if (voiceMode) speakReply(res.reply);
        if (res.done && !finishStartedRef.current) {
          finishStartedRef.current = true;
          setDone(true);
          try {
            const r = await finishConversation(scenarioId);
            // Yeniden başlatmalı günde ikinci tamamlama XP ödemediğinden vaat
            // edilmemiş XP gösterilmez.
            setXpSaved(r.xpEarned > 0);
          } catch {
            // Kayıt reddedildi: vaat edilmemiş XP gösterilmez, kullanıcı bilgilendirilir.
            showAlert('Puan kaydedilemedi', 'İlerlemen şu anda kaydedilemedi. Lütfen bağlantını kontrol edip senaryoyu yeniden dene.');
          }
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
    [course.id, scenarioId, finishConversation, voiceMode, speakReply],
  );

  const onSend = useCallback(() => {
    const text = input.trim();
    if (!text || waiting || limitHit || done) return;
    const history = historyFor(messages);
    pendingRef.current = { text, history };
    setInput('');
    void send(text, history);
  }, [input, waiting, limitHit, done, messages, send]);

  // Konuşma tanıma oturumu bittiğinde: yazılı modda transkript girişe eklenir;
  // sesli modda doğrudan gönderilir (boş ya da gönderim kapalıysa bekletilir).
  // send tanımından SONRA yerleştirilir: bağımlılık dizisi render sırasında
  // okunur.
  useEffect(() => {
    // İş parçacığı ref'i her render'dan önce senkronize edilir; efektler
    // bildirim sırasıyla koştuğundan transkript efekti güncel listeyi okur.
    messagesRef.current = messages;
    const transcript = stt.transcript;
    // Yazılı mod: 'done' transkript girişe eklenir.
    if (!voiceMode && stt.status === 'done' && transcript && transcript !== lastTranscriptRef.current) {
      const text = transcript;
      // İşlenen kayıt tutulur; aynı oturumda tekrar eklenmez. Yeni bir tanıma
      // oturumu (status 'done' dışı) kaydı sıfırlar; tekrarlanan ifadeler dil
      // pratiğinde yaygındır.
      lastTranscriptRef.current = transcript;
      setInput((v) => (v ? `${v} ${text}` : text));
      stt.reset();
      return;
    }
    // Yeni bir tanıma oturumu başladı: işlenen kayıt sıfırlanır.
    if (stt.status !== 'done') {
      lastTranscriptRef.current = '';
      return;
    }
    // Sesli mod: konuşma bitince transkript doğrudan gönderilir. Gönderim
    // kapalıysa (bekleme/limit/bitiş/yükleniyor) oturum TÜKETİLMEZ; durum
    // elverişli olduğunda aynı transkript gönderilir. Boş transkript asla
    // gönderilmez.
    if (
      voiceMode &&
      transcript &&
      transcript.trim() &&
      transcript !== lastTranscriptRef.current &&
      !waiting &&
      !limitHit &&
      !done &&
      state.kind === 'ready'
    ) {
      const text = transcript.trim();
      lastTranscriptRef.current = transcript;
      stt.reset();
      const history = historyFor(messagesRef.current);
      pendingRef.current = { text, history };
      void send(text, history);
    }
  }, [stt, stt.status, stt.transcript, voiceMode, waiting, limitHit, done, state.kind, send, messages]);

  const onRetry = useCallback(() => {
    const pending = pendingRef.current;
    if (pending && !waiting) void send(pending.text, pending.history);
  }, [send, waiting]);

  // Yazılı moda dönüş: açık seslendirme kapatılır ve mikrofon durumu sıfırlanır.
  const switchToWritten = useCallback(() => {
    setSpeaking(false);
    void stopSpeaking();
    void setKonusMode('yazili');
  }, [setKonusMode]);

  const onStopSpeaking = useCallback(() => {
    void stopSpeaking();
    setSpeaking(false);
  }, []);

  // Sesli modda "Konuşmayı yeniden başlat": iş parçacığı açılışa döner; XP
  // günlük/tekil korumalı olduğundan kayıt adımı bitişte yeniden denenir.
  const restartConversation = useCallback(() => {
    if (state.kind !== 'ready') return;
    void stopSpeaking();
    stt.reset();
    setSpeaking(false);
    setMessages([{ role: 'assistant', text: state.scenario.opener }]);
    setDone(false);
    finishStartedRef.current = false;
    setXpSaved(false);
    setShowTr({});
    setShowCorr({});
    setErrorMsg(null);
    setCanRetry(false);
    setLimitHit(false);
    pendingRef.current = null;
  }, [state, stt]);

  const micAvailable = stt.status !== 'unavailable';
  const inputDisabled = waiting || limitHit || done || state.kind !== 'ready';
  // Sesli modda mikrofon yalnızca yanıt beklerken/limitte/bitişte/izinsizken kapalı.
  const micDisabled = waiting || limitHit || done || !micAvailable;
  const userTurns = messages.filter((m) => m.role === 'user').length;
  const correctionCount = messages.filter((m) => m.correction).length;

  return (
    <Screen padding={0} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!user ? (
          // Konuk (veya derin bağlantı): sekmeyle aynı giriş CTA'sı — ağ çağrısı
          // yapılmaz, ulaşılamaz bir yeniden-dene döngüsü gösterilmez.
          <View style={[styles.center, styles.guestBody]}>
            <Body color={colors.textMuted} center>
              Yapay zekâ ile rol yaparak konuşma pratiği yap: kafede sipariş ver, otelde oda ayırt, yol tarifi al.
              Senaryo sonunda hataların Türkçe açıklamayla düzeltilir.
            </Body>
            <Button title="Giriş yap" onPress={() => router.push('/auth')} />
            <Button title="Sınıf koduyla katıl" variant="outline" onPress={() => router.push('/sinif-katil')} />
          </View>
        ) : state.kind === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" accessibilityLabel="Yükleniyor" />
          </View>
        ) : state.kind === 'disabled' ? (
          <View style={[styles.center, styles.guestBody]}>
            <View style={[styles.soonCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Body>🗣️</Body>
              <Heading center>Konuşma pratiği yakında</Heading>
              <Body color={colors.textMuted} center>
                Yapay zekâ destekli konuşma alıştırmaları üzerinde çalışıyoruz. Çok yakında burada olacak!
              </Body>
            </View>
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

            <View style={[styles.modeRow, { borderBottomColor: colors.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yazılı mod"
                accessibilityState={{ checked: !voiceMode }}
                onPress={switchToWritten}
                style={({ pressed }) => [
                  styles.modeChip,
                  {
                    borderColor: colors.borderStrong,
                    backgroundColor: !voiceMode ? colors.primaryTint : colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Caption color={!voiceMode ? colors.primaryText : colors.textMuted}>⌨️ Yazılı</Caption>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sesli mod"
                accessibilityState={{ checked: voiceMode }}
                onPress={() => void setKonusMode('sesli')}
                style={({ pressed }) => [
                  styles.modeChip,
                  {
                    borderColor: colors.borderStrong,
                    backgroundColor: voiceMode ? colors.primaryTint : colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Caption color={voiceMode ? colors.primaryText : colors.textMuted}>🎙️ Sesli</Caption>
              </Pressable>
            </View>

            {voiceMode ? <CharacterCard character={characterFor(state.scenario)} speaking={speaking} /> : null}

            <ScrollView contentContainerStyle={styles.thread}>
              {voiceMode && !micAvailable ? (
                // İzin reddi / tanıyıcı yok: nazik açıklama + yazılı moda dönüş.
                <View style={[styles.notice, { borderColor: colors.warning, backgroundColor: colors.surface }]}>
                  <Body>{MIC_UNAVAILABLE_MESSAGE}</Body>
                  <Button title="Yazılı moda geç" variant="outline" block={false} onPress={switchToWritten} />
                </View>
              ) : null}
              <ChatThread
                messages={messages}
                lang={lang}
                voice={voiceMode}
                showTr={showTr}
                onToggleTr={(i) => setShowTr((prev) => ({ ...prev, [i]: !prev[i] }))}
                showCorr={showCorr}
                onToggleCorr={(i) => setShowCorr((prev) => ({ ...prev, [i]: !prev[i] }))}
                waiting={waiting}
              />
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
                voiceMode ? (
                  <View style={[styles.doneCard, { borderColor: colors.success, backgroundColor: colors.successTint }]}>
                    <Text style={styles.doneEmoji} accessible={false}>
                      🎉
                    </Text>
                    <Heading center>Görev tamam!</Heading>
                    <Body color={colors.textMuted} center>
                      {userTurns} mesaj konuştun, {correctionCount} düzeltme aldın.
                    </Body>
                    {xpSaved ? <Body center>+10 XP kazandın!</Body> : null}
                    <Button title="Konuşmayı yeniden başlat" onPress={restartConversation} />
                  </View>
                ) : (
                  <View style={[styles.doneCard, { borderColor: colors.success, backgroundColor: colors.successTint }]}>
                    <Text style={styles.doneEmoji} accessible={false}>
                      🎉
                    </Text>
                    <Heading center>Görev tamam!</Heading>
                    <Body color={colors.textMuted} center>
                      {xpSaved ? 'Senaryoyu başarıyla tamamladın. +10 XP kazandın!' : 'Senaryoyu başarıyla tamamladın.'}
                    </Body>
                    <Button title="Yeni senaryo" onPress={() => router.push('/konus')} />
                  </View>
                )
              ) : null}
            </ScrollView>

            {voiceMode ? (
              <>
                <View style={[styles.voiceBar, { borderTopColor: colors.border }]}>
                  {speaking ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Durdur"
                      onPress={onStopSpeaking}
                      style={({ pressed }) => [
                        styles.voiceMic,
                        { borderColor: colors.danger, backgroundColor: colors.dangerTint, opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      <Text style={styles.voiceMicGlyph} accessible={false}>
                        ⏹
                      </Text>
                      <Caption color={colors.dangerText}>Durdur</Caption>
                    </Pressable>
                  ) : stt.status === 'listening' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Dinlemeyi durdur"
                      accessibilityState={{ busy: true }}
                      onPress={() => stt.stop()}
                      style={({ pressed }) => [
                        styles.voiceMic,
                        { borderColor: colors.danger, backgroundColor: colors.dangerTint, opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      <Text style={styles.voiceMicGlyph} accessible={false}>
                        🎤
                      </Text>
                      <Caption color={colors.dangerText}>Dinliyorum…</Caption>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Konuşmak için dokun"
                      accessibilityState={{ disabled: micDisabled }}
                      disabled={micDisabled}
                      onPress={() => void stt.start()}
                      style={({ pressed }) => [
                        styles.voiceMic,
                        { borderColor: colors.borderStrong, backgroundColor: colors.surface, opacity: pressed || micDisabled ? 0.5 : 1 },
                      ]}
                    >
                      <Text style={styles.voiceMicGlyph} accessible={false}>
                        🎤
                      </Text>
                      <Caption color={micDisabled ? colors.textMuted : colors.text}>
                        {waiting ? 'Yanıt bekleniyor…' : 'Konuşmak için dokun'}
                      </Caption>
                    </Pressable>
                  )}
                </View>
                <Caption color={colors.textMuted} style={styles.privacy}>
                  {PRIVACY_NOTE}
                </Caption>
              </>
            ) : (
              <>
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
  guestBody: { gap: spacing.md },
  soonCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm, alignItems: 'center' },
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
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  modeChip: { flex: 1, minHeight: 40, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  thread: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  notice: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
  doneCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm, alignItems: 'center' },
  doneEmoji: { fontSize: 40 },
  voiceBar: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs, borderTopWidth: 1 },
  voiceMic: {
    minWidth: 120,
    minHeight: 72,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.lg,
  },
  voiceMicGlyph: { fontSize: 28 },
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
