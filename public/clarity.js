// Clarity belongs only to NEXORA's own public marketing domain. Do not
// collect analytics from customer-owned salon domains or preview deployments.
(function () {
  if (typeof window === "undefined" || !window.location) return;
  const host = window.location.hostname.toLowerCase();
  if (host !== "nexorasalon.online" && host !== "www.nexorasalon.online") return;
})();

(function (c, l, a, r, i, t, y) {
  c[a] = c[a] || function () {
    (c[a].q = c[a].q || []).push(arguments);
  };
  t = l.createElement(r);
  t.async = true;
  t.src = "https://www.clarity.ms/tag/" + i;
  y = l.getElementsByTagName(r)[0];
  y.parentNode.insertBefore(t, y);
})(window, document, "clarity", "script", "zinxfuldee");
