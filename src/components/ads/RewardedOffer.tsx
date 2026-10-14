// Optional rewarded-ad offer: explains the reward first, then presents the ad, then grants the
// reward only on a verified earned callback (via AdService + grantRewardedAd).
import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { RewardedPlacement } from '../../config/ads';
import { adService } from '../../services/ads/adService';
import { analytics } from '../../services/analytics/analytics';
import { grantRewardedAd, rewardedUsesLeft } from '../../state/progression';
import { useApp } from '../../state/useApp';
import { useToast } from '../../state/useToast';
import { colors, space } from '../../theme/theme';
import { dayKey } from '../../utils/dates';
import { Button, Sheet } from '../ui';

export interface OfferRequest {
  placement: RewardedPlacement;
  title: string;
  benefit: string;
  onGranted: () => void;
  grantOpts?: { doubleAmount?: number; bonusRoomId?: string };
}

export function useAdReady() {
  return useSyncExternalStore(
    (cb) => adService.subscribe(cb),
    () => adService.isRewardedReady(),
  );
}

export function useRewardedOffer() {
  const [req, setReq] = useState<OfferRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = useAdReady();
  const toast = useToast((s) => s.show);

  // Poll readiness while the sheet is open (ad loads complete asynchronously).
  const [, force] = useState(0);
  useEffect(() => {
    if (!req) return;
    const t = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [req]);

  const offer = useCallback((r: OfferRequest) => {
    const app = useApp.getState();
    if (!app.save.consent.flowCompletedAt) app.ensureConsentAndAds();
    else adService.loadRewarded();
    analytics.track('rewarded_ad_offered', { placement: r.placement });
    setReq(r);
  }, []);

  const watch = useCallback(async () => {
    if (!req || busy) return;
    setBusy(true);
    const result = await adService.presentRewarded(req.placement);
    setBusy(false);
    const current = req;
    setReq(null);
    if (result.outcome === 'earned') {
      const app = useApp.getState();
      const g = grantRewardedAd(app.save, current.placement, result.token, new Date(), current.grantOpts);
      if (g.granted) {
        app.update(() => g.save);
        analytics.track('reward_granted', { placement: current.placement, source: 'rewarded_ad' });
        current.onGranted();
        toast('Reward granted. Thanks for watching!', 'success');
      } else {
        toast(g.reason === 'limit' ? "You've reached today's limit for this reward." : 'This reward was already granted.', 'warn');
      }
    } else if (result.outcome === 'dismissed') {
      toast('The ad was closed before it finished, so no reward this time.', 'warn');
    } else {
      toast("The ad couldn't be shown. Nothing changed. Try again later.", 'warn');
    }
  }, [req, busy, toast]);

  const today = dayKey();
  const left = req ? rewardedUsesLeft(useApp.getState().save, req.placement, today) : 0;

  const sheet = (
    <Sheet visible={!!req} onRequestClose={() => !busy && setReq(null)} title={req?.title}>
      <Text style={{ color: colors.text, textAlign: 'center', fontSize: 16, fontWeight: '600' }}>{req?.benefit}</Text>
      <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 13 }}>
        Optional. Watch a short video ad to get this reward. You only receive it if the ad plays to the end. {left} left today.
      </Text>
      {busy ? (
        <ActivityIndicator color={colors.cyan} />
      ) : (
        <View style={{ gap: space.sm }}>
          <Button
            label={ready ? 'Watch ad' : 'Loading ad…'}
            icon="video"
            variant="reward"
            disabled={!ready || left <= 0}
            onPress={watch}
            sublabel={left <= 0 ? 'Daily limit reached' : !ready ? 'No ad available yet. You can keep playing.' : undefined}
          />
          <Button label="No thanks" variant="ghost" onPress={() => setReq(null)} />
        </View>
      )}
    </Sheet>
  );

  return { offer, sheet, adReady: ready };
}
