import { t, Trans } from '@lingui/macro';
import SPELLS from 'common/SPELLS';
import { SpellIcon } from 'interface';
import { SpellLink } from 'interface';
import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events from 'parser/core/Events';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import StatTracker from 'parser/shared/modules/StatTracker';
import StatisticBox, { STATISTIC_ORDER } from 'parser/ui/StatisticBox';
import React from 'react';

const COOLDOWN_REDUCTION_MS = 1500;

class CrusadersMight extends Analyzer {
  static dependencies = {
    spellUsable: SpellUsable,
    statTracker: StatTracker,
  };

  effectiveHolyShockReductionMs = 0;
  wastedHolyShockReductionMs = 0;
  wastedHolyShockReductionCount = 0;
  holyShocksCastsLost = 0;

  constructor(...args) {
    super(...args);
    this.active = this.selectedCombatant.hasTalent(SPELLS.CRUSADERS_MIGHT_TALENT.id);
    if (!this.active) {
      return;
    }
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.CRUSADER_STRIKE),
      this.onCast,
    );
  }

  onCast(event) {
    const holyShockisOnCooldown = this.spellUsable.isOnCooldown(SPELLS.HOLY_SHOCK_CAST.id);
    if (holyShockisOnCooldown) {
      const reductionMs = this.spellUsable.reduceCooldown(
        SPELLS.HOLY_SHOCK_CAST.id,
        COOLDOWN_REDUCTION_MS,
      );
      this.effectiveHolyShockReductionMs += reductionMs;
      this.wastedHolyShockReductionMs += COOLDOWN_REDUCTION_MS - reductionMs;
    } else {
      const holyShockCooldown =
        7500 / (1 + this.statTracker.hastePercentage(this.statTracker.currentHasteRating));
      if (
        this.selectedCombatant.hasTalent(SPELLS.SANCTIFIED_WRATH_TALENT_HOLY.id) &&
        this.selectedCombatant.hasBuff(SPELLS.AVENGING_WRATH.id, event.timestamp)
      ) {
        this.holyShocksCastsLost += 1;
      } else {
        this.holyShocksCastsLost += COOLDOWN_REDUCTION_MS / holyShockCooldown;
      }
      this.wastedHolyShockReductionMs += COOLDOWN_REDUCTION_MS;
      this.wastedHolyShockReductionCount += 1;

      // mark the event on the timeline //
      event.meta = event.meta || {};
      event.meta.isInefficientCast = true;
      event.meta.inefficientCastReason = (
        <Trans id="paladin.holy.modules.talents.crusadersMight.inefficientCast">
          Holy Shock was off cooldown when you cast Crusader Strike. You should cast Holy Shock
          before Crusader Strike for maximum healing or damage.
        </Trans>
      );
    }
  }

  get holyShocksMissedThresholds() {
    return {
      actual: this.wastedHolyShockReductionCount,
      isGreaterThan: {
        minor: 0,
        average: 2,
        major: 5,
      },
      style: 'number',
    };
  }

  suggestions(when) {
    when(this.holyShocksMissedThresholds).addSuggestion((suggest, actual, recommended) =>
      suggest(
        <>
          <Trans id="paladin.holy.modules.talents.crusadersMight.suggestion">
            You cast <SpellLink id={SPELLS.CRUSADER_STRIKE.id} />{' '}
            {this.wastedHolyShockReductionCount} times when
            <SpellLink id={SPELLS.HOLY_SHOCK_CAST.id} /> was off cooldown.{' '}
            <SpellLink id={SPELLS.CRUSADER_STRIKE.id} /> should be used to reduce the cooldown of
            <SpellLink id={SPELLS.HOLY_SHOCK_CAST.id} /> and should never be cast when{' '}
            <SpellLink id={SPELLS.HOLY_SHOCK_CAST.id} /> is avalible. This is a core component of
            the <SpellLink id={SPELLS.GLIMMER_OF_LIGHT_TALENT.id} />{' '}
            <a
              href="https://questionablyepic.com/glimmer-of-light/"
              target="_blank"
              rel="noopener noreferrer"
            >
              build.
            </a>
          </Trans>
        </>,
      )
        .icon(SPELLS.HOLY_SHOCK_CAST.icon)
        .actual(
          t({
            id: 'paladin.holy.modules.talents.crusadersMight.actual',

            message: `${Math.floor(this.holyShocksCastsLost)} Holy Shock cast${
              Math.floor(this.holyShocksCastsLost) === 1 ? '' : 's'
            } missed.`,
          }),
        )
        .recommended(
          t({
            id: 'paladin.holy.modules.talents.crusadersMight.recommended',
            message: `Casting Holy Shock on cooldown is recommended.`,
          }),
        ),
    );
  }

  statistic() {
    const formatSeconds = (seconds) => (
      <Trans id="paladin.holy.modules.talents.crusadersMight.formatSeconds">{seconds}s</Trans>
    );

    return (
      <StatisticBox
        position={STATISTIC_ORDER.OPTIONAL(75)}
        icon={<SpellIcon id={SPELLS.CRUSADERS_MIGHT_TALENT.id} />}
        value={
          <>
            {formatSeconds((this.effectiveHolyShockReductionMs / 1000).toFixed(1))}{' '}
            <SpellIcon
              id={SPELLS.HOLY_SHOCK_CAST.id}
              style={{
                height: '1.3em',
                marginTop: '-.1em',
              }}
            />{' '}
          </>
        }
        label={
          <Trans id="paladin.holy.modules.talents.crusadersMight.cdr">Cooldown reduction</Trans>
        }
        tooltip={
          <>
            <Trans id="paladin.holy.modules.talents.crusadersMight.tooltip">
              You cast Crusader Strike <b>{this.wastedHolyShockReductionCount}</b> time
              {this.wastedHolyShockReductionCount === 1 ? '' : 's'} when Holy Shock was off
              cooldown.
              <br />
              This wasted <b>{(this.wastedHolyShockReductionMs / 1000).toFixed(1)}</b> seconds of
              Holy Shock cooldown reduction,
              <br />
              preventing you from <b>{Math.floor(this.holyShocksCastsLost)}</b> additional Holy
              Shock cast{this.holyShocksLost === 1 ? '' : 's'}.<br />
            </Trans>
          </>
        }
      />
    );
  }
}

export default CrusadersMight;
