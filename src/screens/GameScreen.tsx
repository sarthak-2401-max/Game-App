import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRewardedOffer } from '../components/ads/RewardedOffer';
import { Board, themeLook } from '../components/board/Board';
import { Ambient } from '../components/Ambient';
import { Backdrop } from '../components/game/Backdrop';
import { PowerUpBar } from '../components/game/PowerUpBar';
import { DPad } from '../components/game/DPad';
import { RoomBanner } from '../components/game/RoomBanner';
import { MonitorBar, MONITOR_HEIGHT } from '../components/game/MonitorBar';
import { StarChecklist } from '../components/game/Stars';
import { Icon } from '../components/Icon';
import { BeatView, StoryCard } from '../components/StoryCard';
import { chapterScenes, epilogueScenes, type StoryScene } from '../services/story/storyScenes';
import { warmRoom } from '../services/audio/prefetch';
import { Button, CoinBadge, IconButton, Sheet, ToggleRow } from '../components/ui';
import { ACHIEVEMENTS } from '../config/achievements';
import { DEFAULT_COSMETICS } from '../config/cosmetics';
import { solutionKey } from '../game/echo';
import { getClue } from '../game/observer/clues';
import { fillTemplate, openedCells } from '../game/observer/observer';
import { getInterlude, interludeAfter, isInterludeId } from '../game/observer/rooms';
import { OBSERVATION_PALETTE } from '../theme/chapters';
import { ENVIRONMENTS, roomDesign } from '../game/environments';
import { BACKDROPS } from '../services/story/backdrops.generated';
import { memoryView } from '../state/memory';
import { parFor, starCriteria, starsForWin, type StarCriteria } from '../state/mastery';
import { clueLabel, useWitness, type SpokenLine } from './game/useWitness';
import { getPowerUp, POWERUP_TUNING, type PowerUpId } from '../config/powerups';
import { movesAllowed, remainingCores } from '../game/engine';
import { neighbor } from '../game/grid';
import { nextMovesHint } from '../game/hints';
import { CAMPAIGN_SIZE, CHAPTERS, chapterOf, getRoom } from '../game/levels';
import { CHAPTER_STORY, EPILOGUE, ROOM_STORY, type StoryBeat } from '../game/story';
import SOLUTIONS from '../game/levels/solutions.generated.json';
import type { Action, DeathCause } from '../game/types';
import { adService } from '../services/ads/adService';
import { analytics } from '../services/analytics/analytics';
import { sound } from '../services/audio/sound';
import { voice } from '../services/audio/voice';
import { haptics } from '../services/haptics/haptics';
import {
  claimDaily,
  recordDailyResult,
  completeRoom,
  noteRoomForInterstitial,
  recordInterstitialShown,
  rewardedUsesLeft,
  shouldShowInterstitial,
  type RewardLine,
} from '../state/progression';
import { buyPowerUp, powerUpCount, type PowerUpGrant } from '../state/powerups';
import { describeRevive, reviveOffer, roomNeedsWait } from '../state/session';
import { chapterIntroSeen, markChapterIntroSeen, markEpilogueSeen } from '../state/story';
import { useApp } from '../state/useApp';
import { useSession } from '../state/useSession';
import { useToast } from '../state/useToast';
import { colors, radius, space, type } from '../theme/theme';
import { dayKey } from '../utils/dates';

const DEATH_TEXT: Record<DeathCause, string> = {
  spikes: 'You stepped onto raised spikes.',
  laser: 'You walked into a laser beam.',
  drone: 'A patrol drone caught you.',
  fall: 'You fell into the chasm.',
  moves: 'You ran out of moves.',
  timeout: 'The countdown reached zero.',
};

interface Result {
  rewards: RewardLine[];
  achievements: string[];
  firstClear: boolean;
  doubleAmount: number;
  chapterCompleted?: number;
  dailyStatus?: 'claimed' | 'already' | 'blocked';
  powerups: PowerUpGrant[];
  /** Stars earned this run, the best so far before it, and what each star asks for. */
  stars: number;
  prevStars: number;
  criteria: StarCriteria;
  /** WITNESS's lines for this escape. */
  witness: SpokenLine[];
  /** Clues found during this visit. */
  found: string[];
}

interface StoryOverlay {
  kicker: string;
  title: string;
  beats: readonly StoryBeat[];
  scenes?: readonly (StoryScene | undefined)[];
  onDone: () => void;
}

export function GameScreen() {
  const { session, paused } = useSession();
  const S = useSession.getState;
  const app = useApp();
  const insets = useSafeAreaInsets();
  const dims = useWindowDimensions();
  const toast = useToast((s) => s.show);
  const { offer, sheet: offerSheet, open: offerOpen } = useRewardedOffer();
  const [result, setResult] = useState<Result | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintCells, setHintCells] = useState<number[] | undefined>();
  const [introVisible, setIntroVisible] = useState(true);
  const [doubled, setDoubled] = useState(false);
  const [story, setStory] = useState<StoryOverlay | null>(null);
  const [getMore, setGetMore] = useState<PowerUpId | null>(null);
  const [openClue, setOpenClue] = useState<string | null>(null);
  const handledWin = useRef<number>(-1);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const witness = useWitness(session, !!story);
  // The room instruction waits for the story line and WITNESS, then stays for three moves.
  const [introFrom, setIntroFrom] = useState(0);
  const feedBusy = witness.feed.length > 0;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start counting when the monitor frees up
    if (!feedBusy) setIntroFrom(useSession.getState().session?.state.moves ?? 0);
  }, [feedBusy]);
  const settings = app.save.settings;
  const muted = !settings.sound && !settings.music && !settings.voiceover;
  const reduced = settings.reducedMotion;

  const room = session?.room;
  const state = session?.state;
  const failed = !!session && (session.state.status === 'dead' || session.timedOut);
  const won = session?.state.status === 'won';
  // Anything on top of the board stops input and the countdown (sheets, offers, ads, clues).
  const overlayOpen = showHint || !!story || !!getMore || !!openClue || offerOpen;
  const inputEnabled = !!session && !paused && !failed && !won && !overlayOpen;

  // ---- Layout ----------------------------------------------------------------------------
  // Size cells from the space the board area actually gets, so the board never grows over the
  // HUD or the controls (text size, notch and home-indicator insets all vary by device).
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const cell = useMemo(() => {
    if (!room) return 40;
    const frame = 10; // boardFrame padding + border, both sides
    const fallbackH = dims.height - insets.top - insets.bottom - 112 - MONITOR_HEIGHT - (settings.showDpad ? 214 : 96);
    const availW = (area?.w ?? dims.width - 24) - frame;
    const availH = (area?.h ?? fallbackH) - frame;
    // The board stands on a plinth a third of a cell deep.
    return Math.max(16, Math.floor(Math.min(availW / room.width, availH / (room.height + PLINTH), 64)));
  }, [room, area, dims, insets, settings.showDpad]);

  // ---- Reading ahead ------------------------------------------------------------------------
  const kind = session?.kind;
  const roomIndex = session?.room.index;
  // Fetch this room's and the next room's voice lines (and any chapter painting) while the
  // player solves, so the next room opens without a pause in the audio.
  useEffect(() => {
    if (kind !== 'campaign' || !roomIndex) return;
    const t = setTimeout(() => warmRoom(roomIndex), 1200);
    return () => clearTimeout(t);
  }, [kind, roomIndex]);

  // ---- Music --------------------------------------------------------------------------------
  // Each chapter has its own bed; leaving the game goes back to the menu's.
  const chapter = session?.room.chapter;
  useEffect(() => {
    if (chapter) sound.setBase(`ch${chapter}`);
  }, [chapter]);
  useEffect(() => () => sound.setBase('menu'), []);

  // ---- Chapter opening story ----------------------------------------------------------------
  useEffect(() => {
    if (!session || session.kind !== 'campaign') return;
    const ch = CHAPTERS[session.room.chapter - 1];
    const st = ch ? CHAPTER_STORY[ch.number - 1] : undefined;
    if (!ch || !st || session.room.index !== (st.showOnRoom ?? ch.firstRoom) || chapterIntroSeen(useApp.getState().save, ch.number)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens once when a chapter's first room starts
    setStory({
      kicker: `Chapter ${ch.number} · ${st.location}`,
      title: ch.title,
      beats: st.opening,
      scenes: chapterScenes(ch.number, st.opening.length),
      onDone: () => {
        useApp.getState().update((sv) => markChapterIntroSeen(sv, ch.number));
        analytics.track('story_viewed', { kind: 'chapter', chapter: ch.number });
        setStory(null);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.room.id]);

  // ---- Feedback for each action ------------------------------------------------------------
  useEffect(() => {
    if (!session) return;
    for (const e of session.events) {
      switch (e.type) {
        case 'move':
          sound.play('move');
          break;
        case 'bump':
          sound.play('bump');
          haptics.light();
          break;
        case 'push':
          sound.play('push');
          // A crate is heavy: a firmer tap than walking into a wall.
          haptics.medium();
          break;
        case 'switch':
          sound.play('switch');
          haptics.light();
          break;
        case 'unlock':
          sound.play('door');
          break;
        case 'teleport':
          sound.play('teleport');
          break;
        case 'crumble':
          sound.play('crumble');
          break;
        case 'pickup':
          sound.play(e.kind === 'key' ? 'key' : e.kind === 'core' ? 'core' : 'coin');
          haptics.light();
          break;
        case 'checkpoint':
          toast('Checkpoint reached', 'success');
          break;
        case 'exitSealed':
          sound.play('warning');
          toast(`The exit is sealed. Collect ${remainingCores(session.room, session.state)} more core${remainingCores(session.room, session.state) === 1 ? '' : 's'}.`, 'warn');
          break;
        case 'death':
          sound.play('fail');
          haptics.error();
          break;
        case 'win':
          sound.play('win');
          haptics.success();
          break;
        case 'shielded':
          sound.play('unlock');
          haptics.success();
          toast('Shield absorbed the hit. Try another way.', 'success');
          break;
        case 'doors':
          // Doors moved by a switch, plate or echo: a heavy slide, felt as well as heard.
          sound.play('door');
          haptics.light();
          break;
        case 'echoFaded':
          sound.play('echo');
          break;
      }
    }
    // Hints are consumed as the player follows them.
    if (hintCells && session.events.some((e) => e.type === 'move')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts once per engine step (keyed by seq)
      setHintCells((h) => (h && h[0] === session.state.player ? (h.length > 1 ? h.slice(1) : undefined) : undefined));
    }
    if (session.events.length && introVisible && !witness.feed.length && session.state.moves - introFrom >= 3) setIntroVisible(false);
    if (session.state.moves === 0 && session.room.echoTrack?.length && session.attempt > 1) sound.play('echo');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.seq]);

  // ---- Completion --------------------------------------------------------------------------
  useEffect(() => {
    if (!session || !won || handledWin.current === session.seq) return;
    handledWin.current = session.seq;
    const now = new Date();
    const appState = useApp.getState();
    const room = session.room;
    const criteria = starCriteria(room);
    const prevStars = session.kind === 'daily' && session.day ? (appState.save.daily.claims[session.day]?.stars ?? 0) : (appState.save.rooms[room.id]?.stars ?? 0);
    const stars = starsForWin(room, { moves: session.state.moves, usedUndo: session.usedUndo, itemsTaken: session.state.itemsTaken }, appState.save, criteria);
    let next: Result;
    if (session.kind === 'daily' && session.day) {
      const r = claimDaily(appState.save, session.day, now);
      if (r.ok) appState.update(() => r.save);
      // The day's score improves on replays; coins are only ever paid by the first claim.
      const scored = recordDailyResult(useApp.getState().save, session.day, stars, session.state.moves, now);
      appState.update(() => scored.save);
      const achievements = [...(r.ok ? r.achievements : []), ...scored.achievements];
      next = {
        rewards: [...(r.ok ? r.rewards : []), ...scored.rewards],
        achievements,
        firstClear: r.ok,
        doubleAmount: 0,
        powerups: [],
        dailyStatus: r.ok ? 'claimed' : r.reason === 'already_claimed' ? 'already' : 'blocked',
        stars,
        prevStars,
        criteria,
        witness: [],
        found: [],
      };
      analytics.track('daily_challenge_completed', { room_id: room.id, claimed: r.ok, moves: session.state.moves, stars });
      achievements.forEach((id) => analytics.track('achievement_unlocked', { id }));
    } else {
      const par = (SOLUTIONS as Record<string, string>)[solutionKey(room)]?.length;
      const r = completeRoom(appState.save, room, {
        moves: session.state.moves,
        usedUndo: session.usedUndo,
        itemsTaken: session.state.itemsTaken,
        failedAttempts: session.failedAttempts,
        parMoves: par,
        stars,
        memory: { usedUndo: session.usedUndo, visited: session.visited },
      }, now);
      appState.update(() => (session.kind === 'campaign' ? noteRoomForInterstitial(r.save) : r.save));
      next = {
        rewards: r.rewards,
        achievements: [...witness.achievements, ...r.achievements],
        firstClear: r.firstClear,
        doubleAmount: r.doubleEligibleAmount,
        chapterCompleted: r.chapterCompleted,
        powerups: r.powerups,
        stars,
        prevStars,
        criteria,
        witness: witness.winLines({ moves: session.state.moves, deaths: session.failedAttempts }),
        found: witness.foundThisVisit,
      };
      r.powerups.filter((g) => g.reason === 'unlocked').forEach((g) => analytics.track('powerup_unlocked', { powerup: g.id }));
      if (session.kind === 'campaign' && room.index === CAMPAIGN_SIZE && !r.save.story.epilogueSeen) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the win is detected from the session store
        setStory({
          kicker: 'Epilogue',
          title: 'Outside',
          beats: EPILOGUE,
          scenes: epilogueScenes(EPILOGUE.length),
          onDone: () => {
            useApp.getState().update(markEpilogueSeen);
            analytics.track('story_viewed', { kind: 'epilogue' });
            setStory(null);
          },
        });
      }
      r.achievements.forEach((id) => analytics.track('achievement_unlocked', { id }));
      analytics.track('level_completed', {
        room_id: room.id,
        chapter: room.chapter,
        kind: session.kind,
        moves: session.state.moves,
        attempt: session.attempt,
        used_undo: session.usedUndo,
        hints: session.hintsUsed,
        first_clear: r.firstClear,
        stars,
      });
      if (room.chapter === 1 && room.index === 3 && r.firstClear) analytics.track('tutorial_completed', {});
      // Onboarding done: now is a calm moment to ask for ad consent (never during gameplay).
      if (session.kind === 'campaign' && room.index >= 3 && !appState.save.consent.flowCompletedAt) setTimeout(() => useApp.getState().ensureConsentAndAds(), 600);
    }
    if ((stars | prevStars) !== prevStars) analytics.track('stars_earned', { room_id: room.id, stars, prev: prevStars });
    setDoubled(false);
    // Let the escape burst play before the result card slides up (never delays any input).
    if (resultTimer.current) clearTimeout(resultTimer.current);
    // Long enough for the room's ending: the hop, the door light and Pip rolling out.
    resultTimer.current = setTimeout(() => setResult(next), reduced ? 0 : 1150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, session]);
  useEffect(() => () => {
    if (resultTimer.current) clearTimeout(resultTimer.current);
  }, []);

  // The result card reads WITNESS's verdict, then the escape's story beat.
  useEffect(() => {
    if (!result || !session) return;
    const beat = session.kind === 'campaign' ? ROOM_STORY[session.room.index - 1] : undefined;
    const lines = [
      ...result.witness.map((w) => ({ text: w.text, who: 'WITNESS' as const, key: w.voiceKey })),
      ...(beat ? [{ text: beat.text, who: beat.speaker }] : []),
    ];
    const t = setTimeout(() => voice.sayAll(lines), reduced ? 0 : 450);
    return () => {
      clearTimeout(t);
      voice.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per result card
  }, [result]);

  // WITNESS comments on a failure.
  const failLine = failed ? witness.failLine : undefined;
  useEffect(() => {
    if (!failLine) return;
    voice.say(failLine.text, 'WITNESS', undefined, failLine.voiceKey);
    return () => voice.stop();
  }, [failLine]);

  // ---- Real-time countdown (pauses when paused, backgrounded or a sheet is open) --------------
  const appActive = useRef(true);
  const overlayRef = useRef(false);
  useEffect(() => {
    overlayRef.current = overlayOpen;
  }, [overlayOpen]);
  useEffect(() => {
    if (!room?.timeLimit) return;
    let last = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      const st = useSession.getState();
      if (!appActive.current || st.paused || overlayRef.current || adService.isShowing || !st.session || st.session.state.status !== 'playing') return;
      st.tick(Math.min(dt, 1000));
    }, 200);
    return () => clearInterval(t);
  }, [room]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      const active = s === 'active';
      appActive.current = active;
      sound.setAppActive(active);
      const st = useSession.getState();
      if (!active && st.session?.state.status === 'playing') st.setPaused(true);
    });
    return () => sub.remove();
  }, []);

  // Android back: close sheets first, then pause.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showHint) {
        setShowHint(false);
        return true;
      }
      if (openClue) {
        setOpenClue(null);
        return true;
      }
      if (!paused && !failed && !won) {
        S().setPaused(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [showHint, openClue, paused, failed, won, S]);

  // Keyboard (web / hardware keyboards).
  const onAction = useCallback(
    (a: Action) => {
      if (!inputEnabled) return;
      S().act(a);
    },
    [inputEnabled, S],
  );
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const map: Record<string, Action> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', ' ': 'wait' };
    const h = (e: KeyboardEvent) => {
      if (map[e.key]) {
        e.preventDefault();
        onAction(map[e.key]);
      } else if (!inputEnabled) return;
      else if (e.key === 'z' || e.key === 'u') S().undo();
      else if (e.key === 'r') S().restart();
      else if (e.key === 'Escape') S().setPaused(!useSession.getState().paused);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onAction, inputEnabled, S]);

  if (!session || !room || !state) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textDim }}>No room loaded.</Text>
        <Button label="Back to menu" onPress={() => app.home()} />
      </View>
    );
  }

  const today = dayKey();
  const limit = movesAllowed(room, state);
  const movesLeft = limit === Infinity ? undefined : Math.max(0, limit - state.moves);
  // The move star, shown live so players can chase it (absent where there is no known par).
  const target = parFor(room) !== undefined ? starCriteria(room).movesTarget : undefined;
  const coresLeft = remainingCores(room, state);
  const totalCores = room.items.filter((i) => i.kind === 'core').length;
  const hasClock = room.drones.length + room.platforms.length > 0 || room.tags.some((t) => t.startsWith('timed'));
  const canWait = roomNeedsWait(room);
  const interlude = session.kind === 'interlude' ? getInterlude(room.id) : undefined;
  const title =
    session.kind === 'daily'
      ? 'Daily Challenge'
      : session.kind === 'bonus'
        ? 'Bonus Vault'
        : interlude
          ? interlude.title
          : `Chapter ${room.chapter} · Room ${room.index}`;

  /** Where "Next" goes: an Observation interlude after certain rooms, then the next campaign room. */
  const nextStop = (): { kind: 'campaign' | 'interlude'; n?: number; id?: string } | null => {
    const save = useApp.getState().save;
    if (session.kind === 'campaign') {
      const inter = interludeAfter(room.index);
      if (inter && !save.rooms[inter.id]?.completed) return { kind: 'interlude', id: inter.id };
      return room.index < CAMPAIGN_SIZE ? { kind: 'campaign', n: room.index + 1 } : null;
    }
    if (interlude && interlude.after > 0 && interlude.after < CAMPAIGN_SIZE) return { kind: 'campaign', n: interlude.after + 1 };
    return null;
  };

  const goNext = async () => {
    const stop = nextStop();
    // Close the result sheet before any interstitial so nothing is on screen above the ad.
    setResult(null);
    // Interstitials only follow campaign rooms, and never lead straight into an Observation scene.
    if (session.kind === 'campaign' && stop?.kind !== 'interlude' && interstitialDue(room.index)) {
      const shown = await adService.presentInterstitial();
      if (shown) {
        useApp.getState().update((s) => recordInterstitialShown(s, Date.now(), dayKey()));
        analytics.track('interstitial_shown', { after_room: room.id });
      }
    }
    setHintCells(undefined);
    setIntroVisible(true);
    setIntroFrom(0);
    if (stop?.kind === 'interlude' && stop.id) {
      const inter = getInterlude(stop.id);
      if (inter) return S().start(inter.room, 'interlude');
    }
    const next = stop?.n ? getRoom(stop.n) : undefined;
    if (next) S().start(next, 'campaign');
    else app.home();
  };

  /** Leaves an interlude without finishing it; it stays available in the Observation Wing. */
  const skipInterlude = () => {
    analytics.track('interlude_skipped', { room_id: room.id });
    S().setPaused(false);
    setHintCells(undefined);
    setIntroVisible(true);
    setIntroFrom(0);
    const n = interlude && interlude.after > 0 ? interlude.after + 1 : undefined;
    const next = n && n <= CAMPAIGN_SIZE ? getRoom(n) : undefined;
    if (next) S().start(next, 'campaign');
    else app.home();
  };

  const replay = () => {
    setResult(null);
    setHintCells(undefined);
    S().restart();
  };

  const toMenu = () => {
    setResult(null);
    S().setPaused(false);
    app.home();
  };

  const openHint = () => {
    setShowHint(true);
  };

  /** Lights up the next `count` steps of a working route. Returns false if none could be shown. */
  const showRoute = (count: number, source: 'ad' | 'pathfinder'): boolean => {
    const st = useSession.getState().session;
    if (!st) return false;
    const h = nextMovesHint(st.room, st.state, (SOLUTIONS as Record<string, string>)[solutionKey(st.room)], count);
    analytics.track('hint_used', { room_id: st.room.id, kind: source, result: h.kind });
    if (h.kind === 'moves') {
      const cells: number[] = [];
      let c = st.state.player;
      for (const m of h.moves) {
        if (m !== 'wait') c = neighbor(st.room.width, st.room.height, c, m);
        cells.push(c);
      }
      setHintCells(cells);
      const waits = h.moves.filter((m) => m === 'wait').length;
      toast(waits ? `Follow the numbered tiles (includes ${waits} wait${waits > 1 ? 's' : ''}).` : 'Follow the numbered tiles.', 'success');
      return true;
    }
    toast(stuckText(st.room, h.kind), 'warn');
    return false;
  };

  const revealMoves = () => {
    setShowHint(false);
    offer({
      placement: 'hint',
      title: 'Reveal the next moves',
      benefit: 'Shows the next 3 steps of a working solution from where you stand.',
      onGranted: () => {
        S().noteHint();
        showRoute(3, 'ad');
      },
    });
  };

  const BLOCK_TEXT = {
    not_playing: 'Power-ups work only while you are playing.',
    already_active: 'That power-up is already active.',
    no_effect: 'That power-up has nothing to affect in this room.',
    none_left: '',
  } as const;

  const onPowerUp = (id: PowerUpId) => {
    if (powerUpCount(app.save, id) <= 0) {
      setGetMore(id);
      return;
    }
    if (id === 'pathfinder') {
      // Check a route exists before spending the power-up.
      const st = useSession.getState().session;
      if (!st) return;
      const h = nextMovesHint(st.room, st.state, (SOLUTIONS as Record<string, string>)[solutionKey(st.room)], POWERUP_TUNING.pathfinderSteps);
      if (h.kind !== 'moves') {
        toast(stuckText(st.room, h.kind), 'warn');
        return;
      }
    }
    const blocked = S().spendPowerUp(id);
    if (blocked) {
      if (blocked !== 'none_left') toast(BLOCK_TEXT[blocked], 'info');
      return;
    }
    sound.play('unlock');
    haptics.light();
    const def = getPowerUp(id);
    if (id === 'pathfinder') showRoute(POWERUP_TUNING.pathfinderSteps, 'pathfinder');
    else toast(`${def.name} activated.`, 'success');
  };

  const getMoreSheet = (id: PowerUpId) => {
    const def = getPowerUp(id);
    const adsLeft = rewardedUsesLeft(app.save, 'powerup', dayKey());
    return (
      <Sheet visible title={def.name} onRequestClose={() => setGetMore(null)}>
        <View style={{ alignItems: 'center' }}>
          <Icon name={def.icon} size={44} color={def.color} />
        </View>
        <Text style={styles.center}>{def.description}</Text>
        <Text style={styles.centerDim}>You have none left. Get one now:</Text>
        <Button
          label={`Buy for ${def.coinPrice}`}
          icon="coin"
          variant="reward"
          disabled={app.save.coins < def.coinPrice}
          sublabel={app.save.coins < def.coinPrice ? `You have ${app.save.coins} coins` : undefined}
          onPress={() => {
            const r = buyPowerUp(useApp.getState().save, id);
            if (r.ok) {
              app.update(() => r.save);
              analytics.track('powerup_purchased', { powerup: id, currency: 'coins' });
              toast(`${def.name} added.`, 'success');
              setGetMore(null);
            }
          }}
        />
        {adService.hasProvider && adsLeft > 0 && (
          <Button
            label="Watch an ad for 1"
            icon="video"
            onPress={() => {
              setGetMore(null);
              offer({ placement: 'powerup', title: `Free ${def.name}`, benefit: `Get 1 ${def.name} for your inventory.`, grantOpts: { powerUpId: id }, onGranted: () => undefined });
            }}
          />
        )}
        <Button label="Not now" variant="ghost" onPress={() => setGetMore(null)} />
      </Sheet>
    );
  };

  const revive = reviveOffer(session);
  const reviveLeft = rewardedUsesLeft(app.save, 'revive', today);
  const cause: DeathCause | undefined = session.timedOut ? 'timeout' : state.death;
  const nextRoomExists = nextStop() !== null;
  const freeHint = room.hint ?? room.intro ?? mechanicTip(room.tags);
  // Rewarded offers stay out of the onboarding rooms and are hidden when no ad source exists.
  const observation = isInterludeId(room.id) && app.save.cosmetics.selected.theme === DEFAULT_COSMETICS.theme;
  // Campaign rooms each stand somewhere in the Vault; a cosmetic theme replaces the place's look.
  const design = session.kind === 'campaign' && !isInterludeId(room.id) && app.save.cosmetics.selected.theme === DEFAULT_COSMETICS.theme ? roomDesign(room.index) : undefined;
  const environment = design && ENVIRONMENTS[design.env];
  const backdrop = environment && BACKDROPS[environment.id];
  const palette = observation ? OBSERVATION_PALETTE : (environment?.palette ?? themeLook(app.save.cosmetics.selected.theme, room.chapter));
  const adsOn = adService.hasProvider && !(session.kind === 'campaign' && room.index <= 3);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top + 4, paddingBottom: insets.bottom + 8 }]}>
      {backdrop !== undefined && (
        <Backdrop
          source={backdrop}
          tint={palette.bg}
          fx={room.width > 1 ? (state.player % room.width) / (room.width - 1) : 0.5}
          fy={room.height > 1 ? Math.floor(state.player / room.width) / (room.height - 1) : 0.5}
          reduced={reduced}
        />
      )}
      <Ambient color={palette.glow} cy={0.48} strength={0.16} />
      {/* HUD */}
      <View style={styles.hudRow}>
        <IconButton icon="pause" label="Pause" onPress={() => S().setPaused(true)} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.hudTitle} numberOfLines={1}>
            {design ? `Room ${room.index} · ${design.place}` : title}
          </Text>
          <Text style={styles.hudSub} numberOfLines={1}>
            {room.name}
          </Text>
        </View>
        <IconButton
          icon={muted ? 'mute' : 'sound'}
          label={muted ? 'Turn sound on' : 'Mute all sound'}
          size={36}
          onPress={() => app.setSettings(muted ? { sound: true, music: true, voiceover: true } : { sound: false, music: false, voiceover: false })}
        />
        <CoinBadge coins={app.save.coins} compact />
      </View>
      <View style={styles.statsRow}>
        <Stat label="Moves" value={movesLeft !== undefined ? `${movesLeft} left` : String(state.moves)} warn={movesLeft !== undefined && movesLeft <= 3} pop={!reduced} />
        {target !== undefined && (
          <Stat label={state.moves <= target ? '★ Target' : 'Target missed'} value={`${state.moves}/${target}`} accent={state.moves <= target ? colors.gold : undefined} muted={state.moves > target} pop={false} />
        )}
        {session.timeLeftMs !== undefined && <Stat label="Time" value={fmtTime(session.timeLeftMs)} warn={session.timeLeftMs < 10_000} />}
        {totalCores > 0 && <Stat label="Cores" value={`${totalCores - coresLeft}/${totalCores}`} />}
        {(state.keys.gold > 0 || state.keys.blue > 0) && (
          <Stat label="Keys" value={[state.keys.gold ? `${state.keys.gold} gold` : '', state.keys.blue ? `${state.keys.blue} blue` : ''].filter(Boolean).join(' · ')} />
        )}
        {hasClock && <Stat label="Turn" value={String(state.tick)} />}
        {(state.frozen ?? 0) > 0 && <Stat label="Frozen" value={`${state.frozen} left`} accent={getPowerUp('freeze').color} />}
        {session.shieldArmed && <Stat label="Shield" value="Ready" accent={getPowerUp('shield').color} />}
        {room.echo && <Stat label="Echo" value={echoStatus(room, state)} accent={colors.witness} />}
      </View>

      {/* Monitor: the room's instruction, and anything WITNESS has to say. */}
      <View style={styles.monitor}>
        <MonitorBar
          item={witness.feed[0]}
          intro={introVisible && state.moves - introFrom < 3 ? room.intro : undefined}
          reducedMotion={reduced}
          watched={witness.watched}
          onDone={witness.consume}
          onShow={(it) => {
            if (it.speaker === 'CLUE') {
              sound.play('clue');
              haptics.success();
            } else {
              sound.play('observer');
              if (it.speaker === 'WITNESS') haptics.light();
            }
          }}
          onOpenClue={(id) => setOpenClue(id)}
        />
      </View>

      {/* Board */}
      <View
        style={styles.boardWrap}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setArea((a) => (a && Math.abs(a.w - width) < 1 && Math.abs(a.h - height) < 1 ? a : { w: width, h: height }));
        }}
      >
        <View style={[styles.boardFrame, { shadowColor: palette.glow, borderColor: `${palette.glow}40` }]}>
          <Board
            room={room}
            state={state}
            events={session.events}
            seq={session.seq}
            cell={cell}
            look={app.save.cosmetics.selected}
            reducedMotion={reduced}
            hintCells={hintCells}
            checkpointCell={session.checkpoint?.state.player}
            onAction={onAction}
            inputEnabled={inputEnabled}
            frozen={(state.frozen ?? 0) > 0}
            shielded={session.shieldArmed}
            clues={witness.clues}
            dark={witness.dark}
            openingCells={session.attempt === 1 ? openedCells(room) : undefined}
            palette={observation ? OBSERVATION_PALETTE : undefined}
            environment={environment}
            attempt={session.attempt}
            landmark={design?.landmark}
          />
          {!reduced && <RoomBanner show={`${room.id}:${session.visit}`} kicker={design ? design.place : title} title={room.name} color={palette.glow} />}
          <View style={[styles.plinth, { height: Math.round(cell * PLINTH), backgroundColor: palette.wallSide, borderTopColor: `${palette.glow}66` }]}>
            <View style={[styles.plinthTrim, { backgroundColor: palette.glow }]} />
            <View style={styles.plinthShade} />
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <PowerUpBar
          save={app.save}
          disabled={!inputEnabled}
          active={{ shield: session.shieldArmed, freeze: (state.frozen ?? 0) > 0, pathfinder: !!hintCells?.length }}
          onPress={onPowerUp}
        />
        <View style={styles.toolRow}>
          <IconButton icon="undo" label="Undo last move" onPress={() => S().undo()} disabled={!session.history.length || failed || won} />
          <IconButton icon="restart" label="Restart room" onPress={() => { setHintCells(undefined); S().restart(); }} />
          <IconButton icon="hint" label="Hint" onPress={openHint} disabled={failed || won} />
          {!settings.showDpad && canWait && <IconButton icon="wait" label="Wait one turn" onPress={() => onAction('wait')} disabled={!inputEnabled} />}
        </View>
        {settings.showDpad && <DPad onAction={onAction} disabled={!inputEnabled} canWait={canWait} glow={palette.glow} />}
      </View>

      {/* Pause */}
      <Sheet visible={paused && !failed && !won} title="Paused" onRequestClose={() => S().setPaused(false)}>
        {session.timeLeftMs !== undefined && <Text style={styles.center}>The countdown is paused.</Text>}
        <Button label="Resume" variant="primary" icon="play" onPress={() => S().setPaused(false)} />
        <Button label="Restart room" icon="restart" onPress={() => { setHintCells(undefined); S().restart(); }} />
        {interlude && <Button label="Skip this observation" sublabel="You can return to it from the Rooms screen." variant="ghost" onPress={skipInterlude} />}
        <ToggleRow label="Sound effects" icon="sound" value={settings.sound} onChange={(v) => app.setSettings({ sound: v })} />
        <ToggleRow label="Music" icon="music" value={settings.music} onChange={(v) => app.setSettings({ music: v })} />
        <Button label="Main menu" variant="ghost" onPress={toMenu} />
      </Sheet>

      {/* Hint */}
      <Sheet visible={showHint} title="Hint" onRequestClose={() => setShowHint(false)}>
        <Text style={styles.center}>{freeHint}</Text>
        {hasClock && <Text style={styles.centerDim}>Hazards move one step every time you act. Use Wait to let a turn pass.</Text>}
        {room.echo && <Text style={styles.centerDim}>Your echo takes one step every time you act. Use Wait to give it time.</Text>}
        {adsOn && <Button label="Show the next 3 moves" sublabel="Optional rewarded ad" icon="video" variant="reward" onPress={revealMoves} />}
        <Button label="Close" variant="ghost" onPress={() => setShowHint(false)} />
      </Sheet>

      {/* Failure */}
      <Sheet visible={failed && !paused} title="Caught!">
        <Animated.View entering={ZoomIn.duration(220)} style={{ alignItems: 'center' }}>
          <Icon name="flame" size={44} color={colors.danger} />
        </Animated.View>
        <Text style={styles.center}>{cause ? DEATH_TEXT[cause] : 'You failed.'}</Text>
        {witness.failLine && <WitnessLine text={witness.failLine.text} />}
        {room.echo && <Text style={styles.centerDim}>Retry, and this attempt walks beside you as your echo.</Text>}
        <Button label="Retry" variant="primary" icon="restart" onPress={() => { setHintCells(undefined); S().restart(); }} />
        {session.checkpoint && <Button label="Retry from checkpoint" icon="flame" onPress={() => S().fromCheckpoint()} />}
        {adsOn && revive && reviveLeft > 0 && (
          <Button
            label="Revive"
            sublabel={`${describeRevive(revive)} Optional ad, once per attempt.`}
            icon="video"
            variant="reward"
            onPress={() =>
              offer({
                placement: 'revive',
                title: 'Revive',
                benefit: describeRevive(revive),
                onGranted: () => S().revive(),
              })
            }
          />
        )}
        <Button label="Main menu" variant="ghost" onPress={toMenu} />
      </Sheet>

      {/* Completion */}
      <Sheet visible={!!result} title={session.kind === 'daily' ? 'Daily escaped!' : room.index === CAMPAIGN_SIZE && session.kind === 'campaign' ? 'You escaped!' : interlude ? 'Observation complete' : 'Escaped!'}>
        {result && (
          <Animated.View entering={FadeIn.duration(300)} style={{ gap: space.sm }}>
            {room.index === CAMPAIGN_SIZE && session.kind === 'campaign' && (
              <Text style={styles.center}>That was the last room. The way out is finally open. Thank you for playing.</Text>
            )}
            <StarChecklist stars={result.stars} prev={result.prevStars} criteria={result.criteria} reduced={reduced} />
            <Text style={styles.centerDim}>
              {state.moves} moves
              {session.kind === 'daily' && session.day
                ? app.save.daily.claims[session.day]?.bestMoves !== undefined
                  ? ` · today's best ${app.save.daily.claims[session.day]?.bestMoves}`
                  : ''
                : app.save.rooms[room.id]?.bestMoves !== undefined
                  ? ` · best ${app.save.rooms[room.id]?.bestMoves}`
                  : ''}
            </Text>
            {result.witness.map((line, i) => (
              <WitnessLine key={`w${i}`} text={line.text} />
            ))}
            {result.dailyStatus === 'already' && <Text style={styles.centerDim}>You already claimed today’s reward. A new challenge arrives tomorrow.</Text>}
            {result.dailyStatus === 'blocked' && <Text style={styles.centerDim}>Your device clock looks out of sync, so this daily reward can’t be claimed.</Text>}
            {result.rewards.length === 0 && !result.dailyStatus && <Text style={styles.centerDim}>Replays don’t pay coins again, but they can earn stars and improve your best.</Text>}
            {result.rewards.map((r, i) => (
              <Animated.View key={i} entering={FadeInUp.delay(120 * i).duration(250)} style={styles.rewardRow}>
                <Text style={styles.rewardLabel}>{r.label}</Text>
                <Text style={styles.rewardAmt}>+{r.amount}</Text>
              </Animated.View>
            ))}
            {result.powerups.map((g, i) => {
              const def = getPowerUp(g.id);
              return (
                <View key={`pu${i}`} style={[styles.rewardRow, { backgroundColor: `${def.color}1A` }]}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Icon name={def.icon} size={18} color={def.color} />
                    <Text style={styles.rewardLabel}>{g.reason === 'unlocked' ? `New power-up: ${def.name}` : def.name}</Text>
                  </View>
                  <Text style={[styles.rewardAmt, { color: def.color }]}>×{g.count}</Text>
                </View>
              );
            })}
            {result.found.map((id) => {
              const c = getClue(id);
              if (!c) return null;
              return (
                <Pressable key={id} onPress={() => setOpenClue(id)} style={styles.foundRow} accessibilityRole="button" accessibilityLabel={`Found: ${c.title}. Read it.`}>
                  <Icon name="book" size={16} color="#C9A6FF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foundKicker}>{clueLabel(c)}</Text>
                    <Text style={styles.foundTitle}>{c.title}</Text>
                  </View>
                  <Text style={styles.foundOpen}>Read</Text>
                </Pressable>
              );
            })}
            {session.kind === 'campaign' && ROOM_STORY[room.index - 1] && (
              <Animated.View entering={FadeInUp.delay(200).duration(300)} style={styles.storyBox}>
                <Text style={styles.storyKicker}>Story unlocked</Text>
                <BeatView beat={ROOM_STORY[room.index - 1]} compact />
              </Animated.View>
            )}
            {result.achievements.map((id) => (
              <View key={id} style={styles.achRow}>
                <Icon name="trophy" size={18} color={colors.gold} />
                <Text style={styles.achText}>{ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id}</Text>
              </View>
            ))}
            {adsOn && result.doubleAmount > 0 && !doubled && rewardedUsesLeft(app.save, 'double_reward', today) > 0 && (
              <Button
                label={`Double it: +${result.doubleAmount}`}
                sublabel="Optional ad. Your base reward is already yours."
                icon="video"
                variant="reward"
                onPress={() =>
                  offer({
                    placement: 'double_reward',
                    title: 'Double your reward',
                    benefit: `Get another ${result.doubleAmount} Escape Coins for this room.`,
                    grantOpts: { doubleAmount: result.doubleAmount },
                    onGranted: () => setDoubled(true),
                  })
                }
              />
            )}
            {nextRoomExists && (
              <Button
                label={nextStop()?.kind === 'interlude' ? 'Continue' : 'Next room'}
                variant="primary"
                icon="play"
                onPress={goNext}
                sublabel={nextStop()?.kind === 'interlude' ? 'Something is waiting' : chapterOf(nextStop()?.n ?? 0)?.title}
              />
            )}
            {session.kind !== 'daily' && <Button label="Replay" icon="restart" onPress={replay} />}
            <Button label={nextRoomExists ? 'Main menu' : 'Back to menu'} variant={nextRoomExists ? 'ghost' : 'primary'} onPress={toMenu} />
          </Animated.View>
        )}
      </Sheet>
      {getMore && getMoreSheet(getMore)}
      {offerSheet}
      {openClue && <ClueSheet id={openClue} onClose={() => setOpenClue(null)} />}
      {story && <StoryCard kicker={story.kicker} title={story.title} beats={story.beats} scenes={story.scenes} onDone={story.onDone} />}
    </View>
  );
}

function WitnessLine({ text }: { text: string }) {
  return (
    <View style={styles.witness} accessible accessibilityLabel={`WITNESS: ${text}`}>
      <View style={styles.witnessHead}>
        <Text style={styles.witnessName}>WITNESS</Text>
        <View style={styles.recDot} />
      </View>
      <Text style={styles.witnessText}>{text}</Text>
    </View>
  );
}

/** The full text of something found in a room. */
function ClueSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const save = useApp((s) => s.save);
  const c = getClue(id);
  if (!c) return null;
  const related = c.related.map(getClue).filter((x) => x && (save.memory.flags[`clue.${x.id}`] ?? 0) > 0);
  return (
    <Sheet visible title={c.title} onRequestClose={onClose}>
      <Text style={styles.foundKicker}>{clueLabel(c)}</Text>
      <Text style={[styles.clueText, c.kind === 'recording' && { fontStyle: 'italic' }]}>{fillTemplate(c.text, memoryView(save))}</Text>
      {related.length > 0 && <Text style={styles.centerDim}>Connected to: {related.map((r) => r!.title).join(', ')}</Text>}
      <Text style={styles.centerDim}>Kept in the Journal under WITNESS Files.</Text>
      <Button label="Close" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}

function echoStatus(room: { echo?: { linger: number }; echoTrack?: unknown[] }, state: { echo?: number; moves: number }): string {
  if (!room.echoTrack?.length) return 'Recording';
  if (state.echo === undefined || state.echo < 0) return 'Faded';
  const left = room.echoTrack.length + (room.echo?.linger ?? 0) - state.moves;
  return left <= 6 ? `Fading ${left}` : 'Walking';
}

function Stat({ label, value, warn, accent, muted, pop = true }: { label: string; value: string; warn?: boolean; accent?: string; muted?: boolean; pop?: boolean }) {
  return (
    <View style={[styles.stat, warn && { borderColor: colors.danger }, accent ? { borderColor: accent } : null, muted && { opacity: 0.5 }]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.statLabel, accent ? { color: accent } : null]}>{label}</Text>
      {/* Re-keyed on change so each new value pops in. */}
      <Animated.Text key={value} entering={pop ? ZoomIn.duration(160) : undefined} style={[styles.statValue, warn && { color: colors.danger }]}>
        {value}
      </Animated.Text>
    </View>
  );
}

/** Interstitials only ever follow a completed campaign room, and only when the policy allows. */
function interstitialDue(completedRoom: number): boolean {
  const app = useApp.getState();
  return shouldShowInterstitial(app.save, { completedRoom, now: Date.now(), today: dayKey(), consentFlowActive: app.consentRunning });
}

const PLINTH = 0.34;

const fmtTime = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function stuckText(room: { echo?: unknown; echoTrack?: unknown[] }, kind: 'stuck' | 'unknown'): string {
  if (room.echo && kind === 'stuck') {
    return room.echoTrack?.length
      ? "This echo can't help from here. Restart: the attempt you just made becomes your new echo."
      : 'This room needs an echo. Walk to where you need help, then restart.';
  }
  return kind === 'stuck' ? "There's no way out from here. Undo a few moves or restart." : 'This position is too complex to map. Try undoing a few moves.';
}

function mechanicTip(tags: string[]): string {
  if (tags.includes('echo')) return 'Your echo replays your previous attempt, step for step. It holds pressure plates down while it stands on them.';
  if (tags.includes('block')) return 'Blocks can only be pushed, never pulled. Before each push, check the block will not end up stuck against a wall.';
  if (tags.includes('crumble')) return 'Cracked floor collapses behind you. Trace a route that never needs to cross the same crack twice.';
  if (tags.includes('drone')) return 'Drones follow a fixed loop. The dotted circle shows where each one goes next.';
  if (tags.includes('tele')) return 'Portals connect in matching pairs. Look for the matching colour and dots.';
  if (tags.includes('switch')) return 'Every switch flips its circuit each time you step on it. Count your presses.';
  if (tags.includes('timedSpikes') || tags.includes('timedLaser')) return 'Timed traps flash amber the turn before they activate.';
  return 'Look for the safe route to the exit before you take your first step.';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 12 },
  hudRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  hudTitle: { color: colors.textDim, ...type.tiny, textTransform: 'uppercase' },
  hudSub: { color: colors.text, ...type.h2 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' },
  stat: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.surface, alignItems: 'center', minWidth: 64 },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  statValue: { color: colors.text, fontWeight: '800', fontSize: 14, fontVariant: ['tabular-nums'] },
  boardWrap: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginVertical: space.sm, overflow: 'hidden' },
  boardFrame: { padding: 4, paddingBottom: 0, borderRadius: radius.md, backgroundColor: '#05070C', borderWidth: 1, borderColor: '#1C2538', shadowColor: colors.cyan, shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12, overflow: 'hidden' },
  plinth: { marginHorizontal: -4, marginTop: 4, borderTopWidth: 1, overflow: 'hidden' },
  plinthTrim: { position: 'absolute', left: 0, right: 0, top: '30%', height: 2, opacity: 0.45 },
  plinthShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%', backgroundColor: '#00000059' },
  intro: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#0B1A24EE', borderColor: colors.cyanDim, borderWidth: 1, borderRadius: radius.md, padding: 10 },
  introText: { color: colors.text, flex: 1, fontWeight: '600', fontSize: 14 },
  controls: { gap: space.sm, alignItems: 'center' },
  toolRow: { flexDirection: 'row', gap: space.md, justifyContent: 'center' },
  center: { color: colors.text, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  centerDim: { color: colors.textDim, textAlign: 'center', fontSize: 13 },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1B160C', borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12 },
  rewardLabel: { color: colors.text, fontWeight: '600' },
  rewardAmt: { color: colors.amber, fontWeight: '900' },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  achText: { color: colors.gold, fontWeight: '800' },
  storyBox: { backgroundColor: '#0B1220', borderRadius: radius.md, padding: space.md, gap: 6, borderWidth: 1, borderColor: colors.border },
  storyKicker: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  monitor: { marginTop: space.sm, alignSelf: 'stretch', maxWidth: 560, width: '100%', marginHorizontal: 'auto' },
  witness: { backgroundColor: '#0A0D14', borderRadius: radius.md, padding: space.md, gap: 4, borderWidth: 1, borderColor: '#2C3242' },
  witnessHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  witnessName: { color: colors.witness, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.rec },
  witnessText: { color: colors.witness, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  foundRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#151026', borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#3A2D5C' },
  foundKicker: { color: '#C9A6FF', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  foundTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  foundOpen: { color: '#C9A6FF', fontWeight: '800', fontSize: 12 },
  clueText: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '500' },
});
