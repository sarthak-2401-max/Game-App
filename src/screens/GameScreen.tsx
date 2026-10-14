import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRewardedOffer } from '../components/ads/RewardedOffer';
import { Board, themeLook } from '../components/board/Board';
import { Ambient } from '../components/Ambient';
import { PowerUpBar } from '../components/game/PowerUpBar';
import { Icon } from '../components/Icon';
import { BeatView, StoryCard } from '../components/StoryCard';
import { Button, CoinBadge, IconButton, Sheet, ToggleRow } from '../components/ui';
import { ACHIEVEMENTS } from '../config/achievements';
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
import { haptics } from '../services/haptics/haptics';
import {
  claimDaily,
  completeRoom,
  noteRoomForInterstitial,
  recordInterstitialShown,
  rewardedUsesLeft,
  shouldShowInterstitial,
  type RewardLine,
} from '../state/progression';
import { buyPowerUp, powerUpCount, type PowerUpGrant } from '../state/powerups';
import { describeRevive, reviveOffer } from '../state/session';
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
}

interface StoryOverlay {
  kicker: string;
  title: string;
  beats: readonly StoryBeat[];
  onDone: () => void;
}

export function GameScreen() {
  const { session, paused } = useSession();
  const S = useSession.getState;
  const app = useApp();
  const insets = useSafeAreaInsets();
  const dims = useWindowDimensions();
  const toast = useToast((s) => s.show);
  const { offer, sheet: offerSheet } = useRewardedOffer();
  const [result, setResult] = useState<Result | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintCells, setHintCells] = useState<number[] | undefined>();
  const [introVisible, setIntroVisible] = useState(true);
  const [doubled, setDoubled] = useState(false);
  const [story, setStory] = useState<StoryOverlay | null>(null);
  const [getMore, setGetMore] = useState<PowerUpId | null>(null);
  const handledWin = useRef<number>(-1);
  const settings = app.save.settings;
  const reduced = settings.reducedMotion;

  const room = session?.room;
  const state = session?.state;
  const failed = !!session && (session.state.status === 'dead' || session.timedOut);
  const won = session?.state.status === 'won';
  const inputEnabled = !!session && !paused && !failed && !won && !showHint && !story;

  // ---- Layout ----------------------------------------------------------------------------
  // Size cells from the space the board area actually gets, so the board never grows over the
  // HUD or the controls (text size, notch and home-indicator insets all vary by device).
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const cell = useMemo(() => {
    if (!room) return 40;
    const frame = 10; // boardFrame padding + border, both sides
    const fallbackH = dims.height - insets.top - insets.bottom - 112 - (settings.showDpad ? 214 : 96);
    const availW = (area?.w ?? dims.width - 24) - frame;
    const availH = (area?.h ?? fallbackH) - frame;
    return Math.max(16, Math.floor(Math.min(availW / room.width, availH / room.height, 64)));
  }, [room, area, dims, insets, settings.showDpad]);

  // ---- Chapter opening story ----------------------------------------------------------------
  useEffect(() => {
    if (!session || session.kind !== 'campaign') return;
    const ch = CHAPTERS[session.room.chapter - 1];
    if (!ch || session.room.index !== ch.firstRoom || chapterIntroSeen(useApp.getState().save, ch.number)) return;
    const st = CHAPTER_STORY[ch.number - 1];
    if (!st) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens once when a chapter's first room starts
    setStory({
      kicker: `Chapter ${ch.number} · ${st.location}`,
      title: ch.title,
      beats: st.opening,
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
      }
    }
    // Hints are consumed as the player follows them.
    if (hintCells && session.events.some((e) => e.type === 'move')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts once per engine step (keyed by seq)
      setHintCells((h) => (h && h[0] === session.state.player ? (h.length > 1 ? h.slice(1) : undefined) : undefined));
    }
    if (session.events.length && introVisible && session.state.moves >= 3) setIntroVisible(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.seq]);

  // ---- Completion --------------------------------------------------------------------------
  useEffect(() => {
    if (!session || !won || handledWin.current === session.seq) return;
    handledWin.current = session.seq;
    const now = new Date();
    const appState = useApp.getState();
    if (session.kind === 'daily' && session.day) {
      const r = claimDaily(appState.save, session.day, now);
      if (r.ok) appState.update(() => r.save);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the win is detected from the session store
      setResult({
        rewards: r.ok ? r.rewards : [],
        achievements: r.ok ? r.achievements : [],
        firstClear: r.ok,
        doubleAmount: 0,
        powerups: [],
        dailyStatus: r.ok ? 'claimed' : r.reason === 'already_claimed' ? 'already' : 'blocked',
      });
      analytics.track('daily_challenge_completed', { room_id: session.room.id, claimed: r.ok, moves: session.state.moves });
      if (r.ok) r.achievements.forEach((id) => analytics.track('achievement_unlocked', { id }));
    } else {
      const par = (SOLUTIONS as Record<string, string>)[session.room.id]?.length;
      const r = completeRoom(appState.save, session.room, {
        moves: session.state.moves,
        usedUndo: session.usedUndo,
        itemsTaken: session.state.itemsTaken,
        failedAttempts: session.failedAttempts,
        parMoves: par,
      }, now);
      appState.update(() => (session.kind === 'campaign' ? noteRoomForInterstitial(r.save) : r.save));
      setResult({ rewards: r.rewards, achievements: r.achievements, firstClear: r.firstClear, doubleAmount: r.doubleEligibleAmount, chapterCompleted: r.chapterCompleted, powerups: r.powerups });
      r.powerups.filter((g) => g.reason === 'unlocked').forEach((g) => analytics.track('powerup_unlocked', { powerup: g.id }));
      if (session.kind === 'campaign' && session.room.index === CAMPAIGN_SIZE && !r.save.story.epilogueSeen) {
        setStory({
          kicker: 'Epilogue',
          title: 'Outside',
          beats: EPILOGUE,
          onDone: () => {
            useApp.getState().update(markEpilogueSeen);
            analytics.track('story_viewed', { kind: 'epilogue' });
            setStory(null);
          },
        });
      }
      r.achievements.forEach((id) => analytics.track('achievement_unlocked', { id }));
      analytics.track('level_completed', {
        room_id: session.room.id,
        chapter: session.room.chapter,
        moves: session.state.moves,
        attempt: session.attempt,
        used_undo: session.usedUndo,
        hints: session.hintsUsed,
        first_clear: r.firstClear,
      });
      if (session.room.chapter === 1 && session.room.index === 3 && r.firstClear) analytics.track('tutorial_completed', {});
      // Onboarding done: now is a calm moment to ask for ad consent (never during gameplay).
      if (session.room.index >= 3 && !appState.save.consent.flowCompletedAt) setTimeout(() => useApp.getState().ensureConsentAndAds(), 600);
    }
    setDoubled(false);
  }, [won, session]);

  // ---- Real-time countdown (pauses when paused, backgrounded or a sheet is open) --------------
  const appActive = useRef(true);
  const storyOpen = useRef(false);
  useEffect(() => {
    storyOpen.current = !!story;
  }, [story]);
  useEffect(() => {
    if (!room?.timeLimit) return;
    let last = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      const st = useSession.getState();
      if (!appActive.current || st.paused || showHint || storyOpen.current || !st.session || st.session.state.status !== 'playing') return;
      st.tick(Math.min(dt, 1000));
    }, 200);
    return () => clearInterval(t);
  }, [room, showHint]);

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
      if (!paused && !failed && !won) {
        S().setPaused(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [showHint, paused, failed, won, S]);

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
      } else if (e.key === 'z' || e.key === 'u') S().undo();
      else if (e.key === 'r') S().restart();
      else if (e.key === 'Escape') S().setPaused(!useSession.getState().paused);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onAction, S]);

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
  const coresLeft = remainingCores(room, state);
  const totalCores = room.items.filter((i) => i.kind === 'core').length;
  const hasClock = room.drones.length + room.platforms.length > 0 || room.tags.some((t) => t.startsWith('timed'));
  const title = session.kind === 'daily' ? 'Daily Challenge' : session.kind === 'bonus' ? 'Bonus Vault' : `Chapter ${room.chapter} · Room ${room.index}`;

  const goNext = async () => {
    const n = room.index + 1;
    // Close the result sheet before any interstitial so nothing is on screen above the ad.
    setResult(null);
    if (session.kind === 'campaign' && interstitialDue(room.index)) {
      const shown = await adService.presentInterstitial();
      if (shown) {
        useApp.getState().update((s) => recordInterstitialShown(s, Date.now(), dayKey()));
        analytics.track('interstitial_shown', { after_room: room.id });
      }
    }
    setResult(null);
    setHintCells(undefined);
    setIntroVisible(true);
    const next = getRoom(n);
    if (session.kind === 'campaign' && next && n <= CAMPAIGN_SIZE) S().start(next, 'campaign');
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
    const h = nextMovesHint(st.room, st.state, (SOLUTIONS as Record<string, string>)[st.room.id], count);
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
    toast(h.kind === 'stuck' ? "There's no way out from here. Undo a few moves or restart." : 'This position is too complex to map. Try undoing a few moves.', 'warn');
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
      const h = nextMovesHint(st.room, st.state, (SOLUTIONS as Record<string, string>)[st.room.id], POWERUP_TUNING.pathfinderSteps);
      if (h.kind !== 'moves') {
        toast(h.kind === 'stuck' ? "There's no way out from here. Undo a few moves or restart." : 'This position is too complex to map. Try undoing a few moves.', 'warn');
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
  const nextRoomExists = session.kind === 'campaign' && room.index < CAMPAIGN_SIZE;
  const freeHint = room.hint ?? room.intro ?? mechanicTip(room.tags);
  // Rewarded offers stay out of the onboarding rooms and are hidden when no ad source exists.
  const palette = themeLook(app.save.cosmetics.selected.theme, room.chapter);
  const adsOn = adService.hasProvider && !(session.kind === 'campaign' && room.index <= 3);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top + 4, paddingBottom: insets.bottom + 8 }]}>
      <Ambient color={palette.glow} cy={0.48} strength={0.16} />
      {/* HUD */}
      <View style={styles.hudRow}>
        <IconButton icon="pause" label="Pause" onPress={() => S().setPaused(true)} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.hudTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.hudSub} numberOfLines={1}>
            {room.name}
          </Text>
        </View>
        <CoinBadge coins={app.save.coins} compact />
      </View>
      <View style={styles.statsRow}>
        <Stat label="Moves" value={movesLeft !== undefined ? `${movesLeft} left` : String(state.moves)} warn={movesLeft !== undefined && movesLeft <= 3} />
        {session.timeLeftMs !== undefined && <Stat label="Time" value={fmtTime(session.timeLeftMs)} warn={session.timeLeftMs < 10_000} />}
        {totalCores > 0 && <Stat label="Cores" value={`${totalCores - coresLeft}/${totalCores}`} />}
        {(state.keys.gold > 0 || state.keys.blue > 0) && (
          <Stat label="Keys" value={[state.keys.gold ? `${state.keys.gold} gold` : '', state.keys.blue ? `${state.keys.blue} blue` : ''].filter(Boolean).join(' · ')} />
        )}
        {hasClock && <Stat label="Turn" value={String(state.tick)} />}
        {(state.frozen ?? 0) > 0 && <Stat label="Frozen" value={`${state.frozen} left`} accent={getPowerUp('freeze').color} />}
        {session.shieldArmed && <Stat label="Shield" value="Ready" accent={getPowerUp('shield').color} />}
      </View>

      {/* Board */}
      <View
        style={styles.boardWrap}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setArea((a) => (a && Math.abs(a.w - width) < 1 && Math.abs(a.h - height) < 1 ? a : { w: width, h: height }));
        }}
      >
        {introVisible && room.intro && state.moves < 3 && (
          <Animated.View entering={FadeInUp.duration(250)} style={styles.intro}>
            <Icon name="info" size={18} color={colors.cyan} />
            <Text style={styles.introText}>{room.intro}</Text>
          </Animated.View>
        )}
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
          />
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
          {!settings.showDpad && hasClock && <IconButton icon="wait" label="Wait one turn" onPress={() => onAction('wait')} disabled={!inputEnabled} />}
        </View>
        {settings.showDpad && (
          <View style={styles.dpad}>
            <View style={styles.dpadRow}>
              <IconButton icon="up" label="Move up" size={58} onPress={() => onAction('up')} disabled={!inputEnabled} />
            </View>
            <View style={styles.dpadRow}>
              <IconButton icon="left" label="Move left" size={58} onPress={() => onAction('left')} disabled={!inputEnabled} />
              {hasClock ? (
                <IconButton icon="wait" label="Wait one turn" size={58} onPress={() => onAction('wait')} disabled={!inputEnabled} />
              ) : (
                <View style={{ width: 58 }} />
              )}
              <IconButton icon="right" label="Move right" size={58} onPress={() => onAction('right')} disabled={!inputEnabled} />
            </View>
            <View style={styles.dpadRow}>
              <IconButton icon="down" label="Move down" size={58} onPress={() => onAction('down')} disabled={!inputEnabled} />
            </View>
          </View>
        )}
      </View>

      {/* Pause */}
      <Sheet visible={paused && !failed && !won} title="Paused" onRequestClose={() => S().setPaused(false)}>
        {session.timeLeftMs !== undefined && <Text style={styles.center}>The countdown is paused.</Text>}
        <Button label="Resume" variant="primary" icon="play" onPress={() => S().setPaused(false)} />
        <Button label="Restart room" icon="restart" onPress={() => { setHintCells(undefined); S().restart(); }} />
        <ToggleRow label="Sound effects" icon="sound" value={settings.sound} onChange={(v) => app.setSettings({ sound: v })} />
        <ToggleRow label="Music" icon="music" value={settings.music} onChange={(v) => app.setSettings({ music: v })} />
        <Button label="Main menu" variant="ghost" onPress={toMenu} />
      </Sheet>

      {/* Hint */}
      <Sheet visible={showHint} title="Hint" onRequestClose={() => setShowHint(false)}>
        <Text style={styles.center}>{freeHint}</Text>
        {hasClock && <Text style={styles.centerDim}>Hazards move one step every time you act. Use Wait to let a turn pass.</Text>}
        {adsOn && <Button label="Show the next 3 moves" sublabel="Optional rewarded ad" icon="video" variant="reward" onPress={revealMoves} />}
        <Button label="Close" variant="ghost" onPress={() => setShowHint(false)} />
      </Sheet>

      {/* Failure */}
      <Sheet visible={failed && !paused} title="Caught!">
        <Animated.View entering={ZoomIn.duration(220)} style={{ alignItems: 'center' }}>
          <Icon name="flame" size={44} color={colors.danger} />
        </Animated.View>
        <Text style={styles.center}>{cause ? DEATH_TEXT[cause] : 'You failed.'}</Text>
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
      <Sheet visible={!!result} title={session.kind === 'daily' ? 'Daily escaped!' : room.index === CAMPAIGN_SIZE && session.kind === 'campaign' ? 'You escaped!' : 'Escaped!'}>
        {result && (
          <Animated.View entering={FadeIn.duration(300)} style={{ gap: space.sm }}>
            {room.index === CAMPAIGN_SIZE && session.kind === 'campaign' && (
              <Text style={styles.center}>That was the last room. The way out is finally open. Thank you for playing.</Text>
            )}
            <Text style={styles.centerDim}>
              {state.moves} moves{app.save.rooms[room.id]?.bestMoves !== undefined ? ` · best ${app.save.rooms[room.id]?.bestMoves}` : ''}
            </Text>
            {result.dailyStatus === 'already' && <Text style={styles.centerDim}>You already claimed today’s reward. A new challenge arrives tomorrow.</Text>}
            {result.dailyStatus === 'blocked' && <Text style={styles.centerDim}>Your device clock looks out of sync, so this daily reward can’t be claimed.</Text>}
            {result.rewards.length === 0 && !result.dailyStatus && <Text style={styles.centerDim}>Replays don’t pay coins again, but they count toward your best.</Text>}
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
            {nextRoomExists && <Button label="Next room" variant="primary" icon="play" onPress={goNext} sublabel={chapterOf(room.index + 1)?.title} />}
            {session.kind !== 'daily' && <Button label="Replay" icon="restart" onPress={replay} />}
            <Button label={nextRoomExists ? 'Main menu' : 'Back to menu'} variant={nextRoomExists ? 'ghost' : 'primary'} onPress={toMenu} />
          </Animated.View>
        )}
      </Sheet>
      {getMore && getMoreSheet(getMore)}
      {offerSheet}
      {story && <StoryCard kicker={story.kicker} title={story.title} beats={story.beats} onDone={story.onDone} />}
    </View>
  );
}

function Stat({ label, value, warn, accent }: { label: string; value: string; warn?: boolean; accent?: string }) {
  return (
    <View style={[styles.stat, warn && { borderColor: colors.danger }, accent ? { borderColor: accent } : null]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.statLabel, accent ? { color: accent } : null]}>{label}</Text>
      <Text style={[styles.statValue, warn && { color: colors.danger }]}>{value}</Text>
    </View>
  );
}

/** Interstitials only ever follow a completed campaign room, and only when the policy allows. */
function interstitialDue(completedRoom: number): boolean {
  const app = useApp.getState();
  return shouldShowInterstitial(app.save, { completedRoom, now: Date.now(), today: dayKey(), consentFlowActive: app.consentRunning });
}

const fmtTime = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function mechanicTip(tags: string[]): string {
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
  boardFrame: { padding: 4, borderRadius: radius.md, backgroundColor: '#05070C', borderWidth: 1, borderColor: '#1C2538', shadowColor: colors.cyan, shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  intro: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#0B1A24EE', borderColor: colors.cyanDim, borderWidth: 1, borderRadius: radius.md, padding: 10 },
  introText: { color: colors.text, flex: 1, fontWeight: '600', fontSize: 14 },
  controls: { gap: space.sm, alignItems: 'center' },
  toolRow: { flexDirection: 'row', gap: space.md, justifyContent: 'center' },
  dpad: { alignItems: 'center', gap: 4 },
  dpadRow: { flexDirection: 'row', gap: 4 },
  center: { color: colors.text, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  centerDim: { color: colors.textDim, textAlign: 'center', fontSize: 13 },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1B160C', borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12 },
  rewardLabel: { color: colors.text, fontWeight: '600' },
  rewardAmt: { color: colors.amber, fontWeight: '900' },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  achText: { color: colors.gold, fontWeight: '800' },
  storyBox: { backgroundColor: '#0B1220', borderRadius: radius.md, padding: space.md, gap: 6, borderWidth: 1, borderColor: colors.border },
  storyKicker: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
});
