const panel = document.getElementById("edition");
const query = new URLSearchParams(location.search);
const region = query.get("region");
const mode = query.get("mode");
if (mode === "management") {
  const { openManagement } = await import("./management.js");
  openManagement(panel);
} else if (mode === "naval" || region === "kr") {
  panel.remove();
  await import("../client.js");
} else if (region === "us") {
  document.documentElement.lang = "en";
  document.title = "Steel Tide · United States";
  const { startCareer } = await import("./us-ui.js");
  startCareer(panel);
}
