import SPELLS from 'common/SPELLS/classic/warlock';
import { formatPercentage } from 'common/format';
import { SpellIcon } from 'interface';
import Analyzer from 'parser/core/Analyzer';
import { ThresholdStyle } from 'parser/core/ParseResults';
import Enemies from 'parser/shared/modules/Enemies';
import UptimeBar from 'parser/ui/UptimeBar';

class CurseOfTheElements extends Analyzer {
  static dependencies = {
    enemies: Enemies,
  };
  protected enemies!: Enemies;

  get uptime() {
    return this.enemies.getBuffUptime(SPELLS.CURSE_OF_THE_ELEMENTS.id) / this.owner.fightDuration;
  }

  get suggestionThresholds() {
    return {
      actual: this.uptime,
      isLessThan: {
        minor: 0.95,
        average: 0.9,
        major: 0.8,
      },
      style: ThresholdStyle.PERCENTAGE,
    };
  }

  subStatistic() {
    const history = this.enemies.getDebuffHistory(SPELLS.CURSE_OF_THE_ELEMENTS.id);
    return (
      <div className="flex">
        <div className="flex-sub icon">
          <SpellIcon id={SPELLS.CURSE_OF_THE_ELEMENTS.id} />
        </div>
        <div className="flex-sub value" style={{ width: 140 }}>
          {formatPercentage(this.uptime, 0)}% <small>uptime</small>
        </div>
        <div className="flex-main chart" style={{ padding: 15 }}>
          <UptimeBar
            uptimeHistory={history}
            start={this.owner.fight.start_time}
            end={this.owner.fight.end_time}
          />
        </div>
      </div>
    );
  }
}

export default CurseOfTheElements;
