const panel = document.getElementById("edition");
const query = new URLSearchParams(location.search);
const region = query.get("region");
if (region === "kr") {
  panel.remove();
  await import("../client.js");
} else if (region === "us") {
  document.documentElement.lang = "en";
  document.title = "Steel Tide · United States";
  const { startCareer } = await import("./us-ui.js");
  startCareer(panel);
} else {
  panel.querySelectorAll("[data-region]").forEach((link) => {
    const url = new URL(location.href);
    url.searchParams.set("region", link.dataset.region);
    link.href = url;
  });
}
