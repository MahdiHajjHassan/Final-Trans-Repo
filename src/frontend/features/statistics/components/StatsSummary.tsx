import type { StatsSummary as Summary } from "@/shared/statistics";
import type { Dictionary } from "@/shared/i18n/dictionaries";

// Saved-game facts and explicit earned/locked milestones share the existing reading rhythm.
export function StatsSummary({ summary, t }: { summary: Summary; t: Dictionary }) {
  const facts: Array<[string, number | string]> = [
    [t.played, summary.played],
    [t.wins, summary.wins],
    [t.losses, summary.losses],
    [t.draws, summary.draws],
    [t.points, summary.points],
    [t.rank, summary.rank ?? t.unranked],
    [t.winRate, `${summary.winRate}%`],
  ];
  return (
    <section className="section stats-summary">
      <h2>{t.competitiveSummary}</h2>
      <dl className="stats-facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <bdi>{value}</bdi>
            </dd>
          </div>
        ))}
      </dl>
      <p>{t.rankingRules}</p>
      <div className="stats-group">
        <h3>
          {t.level} <bdi>{summary.level}</bdi>
        </h3>
        <label htmlFor="level-progress">{t.levelProgress}</label>
        <progress
          id="level-progress"
          className="level-progress"
          max={summary.nextLevelPoints}
          value={summary.progress}
        />
        <p>
          <bdi>
            {summary.progress}/{summary.nextLevelPoints}
          </bdi>{" "}
          {t.pointsToNext}
        </p>
      </div>
      <div className="stats-group">
        <h3>{t.achievements}</h3>
        <ul className="achievement-list">
          {summary.achievements.map((achievement) => (
            <li key={achievement.id}>
              <strong>{t[achievement.id]}</strong>
              <span>
                {achievement.earned ? t.achievementEarned : t.achievementLocked} ·{" "}
                <bdi>
                  {achievement.current}/{achievement.target}
                </bdi>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
