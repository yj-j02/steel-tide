import { openingDuty, openingEvent } from "./army-opening.js";
import { careerDate } from "./service-calendar.js";

export function dutyHistory(duty) {
  const history = new Map(
    (duty.timeline ?? []).map((event) => [event.id, event]),
  );
  for (const [track, choices] of Object.entries(duty.openingChoices ?? {})) {
    for (const [step, choice] of Object.entries(choices)) {
      const turn = Number(step);
      const event = openingDuty(track, turn);
      if (!event?.options[choice] || history.has(event.id)) continue;
      const next = openingDuty(track, turn + 1);
      history.set(event.id, {
        id: event.id,
        turn,
        opening: true,
        date: careerDate(turn, { 0: turn - 1 }),
        title: event.title,
        choice: event.options[choice],
        outcome: event.outcomes[choice],
        nextTitle: next?.title,
        nextPoints: next ? (choice === 0 ? 4 : -4) : undefined,
      });
    }
  }
  return [...history.values()]
    .map((event) => {
      if (!event.opening || !event.nextTitle) return event;
      const chapter = openingEvent(event.id);
      return {
        ...event,
        followupCompleted: history.has(
          openingDuty(chapter?.track, event.turn + 1)?.id,
        ),
      };
    })
    .sort((a, b) => a.turn - b.turn);
}

export function representativeDecision(duty) {
  const events = dutyHistory(duty).filter(
    (event) => event.opening && event.nextPoints != null,
  );
  return (
    events.findLast((event) => event.nextPoints > 0) ?? events.at(-1) ?? null
  );
}
