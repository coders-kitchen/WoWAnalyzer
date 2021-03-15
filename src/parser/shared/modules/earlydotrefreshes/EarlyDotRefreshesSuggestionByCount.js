import { t } from '@lingui/macro';
import { formatPercentage } from 'common/format';
import { SpellLink } from 'interface';
import React from 'react';

function suggest(when, suggestion) {
  when(suggestion).addSuggestion((suggest, actual, recommended) =>
    suggest(
      <>
        You refreshed <SpellLink id={suggestion.spell.id} /> early {suggestion.count} times. The
        individual casts are highlighted on the timeline.
      </>,
    )
      .icon(suggestion.spell.icon)
      .actual(
        t({
          id: 'shared.suggestions.dots.countEarlyRefreshes',
          message: `${formatPercentage(actual)}% effective duration`,
        }),
      )
      .recommended(`<${formatPercentage(recommended)}% is recommended`),
  );
}

export default suggest;
