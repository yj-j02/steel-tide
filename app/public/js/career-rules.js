/** Resolve a chamber vote, assuming every seat is filled and casts a vote. */
export function chamberVote(
  size,
  support,
  threshold = Math.floor(size / 2) + 1,
) {
  const yes = Math.round(Math.max(0, Math.min(size, support)));
  return { yes, no: size - yes, ok: yes >= threshold };
}
export function adminBar(enabled, title, actions) {
  if (!enabled || !actions.length) return "";
  return (
    '<div class="adm-bar"><b>' +
    title +
    "</b>" +
    actions
      .map(
        ([id, label]) => '<button data-adm="' + id + '">' + label + "</button>",
      )
      .join("") +
    "</div>"
  );
}

export const projectPoint = (lon, lat, west, north, scaleX, scaleY) => [
  (lon - west) * scaleX,
  (north - lat) * scaleY,
];

export function docketPaper(office, title, reference, description, controls) {
  return `<div class="mn-card mn-dk mn-paper"><div class="dh"><div class="dt"><small>${office}</small><b>${title}</b><span>${reference}</span></div></div><p>${description}</p>${controls}</div>`;
}
