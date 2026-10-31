// src/lib/resolveSite.ts
function trimSlashes(s) {
  if (typeof s !== "string") return "";
  return s.replace(/^\/+|\/+$/g, "");
}
function resolveSiteSlug(input) {
  if (!input) return null;
  let hostname = "";
  let search = "";
  let pathname = "";
  let href = "";
  let origin = "";
  if (typeof input === "string") {
    href = input;
    if (input.includes("?")) {
      const parts = input.split("?");
      pathname = parts[0];
      search = "?" + parts.slice(1).join("?");
    } else {
      pathname = input;
    }
  } else if (typeof input === "object" && input !== null) {
    hostname = input.hostname || "";
    search = input.search || "";
    pathname = input.pathname || "";
    href = input.href || "";
    origin = input.origin || "";
  }
  if (!hostname && href) {
    try {
      const u = new URL(href);
      hostname = u.hostname;
      if (!search && u.search) search = u.search;
      if (!pathname && u.pathname) pathname = u.pathname;
    } catch {
    }
  }
  if (!hostname && origin) {
    try {
      const u = new URL(origin);
      hostname = u.hostname;
    } catch {
    }
  }
  if (search) {
    try {
      const params = new URLSearchParams(search);
      const site = params.get("site") || params.get("s") || params.get("subdomain");
      if (site) {
        const trimmed = site.trim();
        return trimmed ? trimmed.toLowerCase() : null;
      }
    } catch {
    }
  }
  if (hostname) {
    const lowerHost = hostname.toLowerCase();
    if (lowerHost === "nexora.app" || lowerHost === "www.nexora.app" || lowerHost === "nexorasalon.online" || lowerHost === "www.nexorasalon.online" || lowerHost === "localhost" || lowerHost === "127.0.0.1" || lowerHost.endsWith(".e2b.app") || lowerHost.endsWith(".vercel.app") || lowerHost.endsWith(".chatgpt.site")) {
      return null;
    }
    const parts = lowerHost.split(".");
    if (parts.length >= 3) {
      const sub = parts[0];
      if (sub && sub !== "www" && sub !== "app" && sub !== "ais-dev" && sub !== "ais-pre" && sub !== "studioflow" && sub.length > 1 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(sub)) {
        return sub;
      }
    }
  }
  if (pathname) {
    const clean = trimSlashes(pathname);
    if (clean) {
      const parts = clean.split("/");
      const first = parts[0]?.toLowerCase();
      if (first && first !== "app" && first !== "invite" && first !== "api" && first.length > 1 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(first)) {
        return first;
      }
    }
  }
  return null;
}

// scripts/verify-subdomain-routing.tsx
var cases = [
  ["query param wins", { search: "?site=glow-studio", hostname: "other.example.com" }, "glow-studio"],
  ["query slugs are case-insensitive", { search: "?site=Roop-Mahal", hostname: "nexora.app" }, "roop-mahal"],
  ["query on apex host", { search: "?site=a", hostname: "nexora.app" }, "a"],
  ["subdomain alias", { search: "", hostname: "glow-studio.nexora.app" }, "glow-studio"],
  ["hostname from href", { search: "", href: "https://glow-studio.nexora.app/?app=1" }, "glow-studio"],
  ["hostname from origin", { origin: "https://glow-studio.nexora.app" }, "glow-studio"],
  ["apex serves owner app", { search: "", hostname: "nexora.app" }, null],
  ["www serves owner app", { search: "", hostname: "www.nexora.app" }, null],
  ["reserved labels skipped", { search: "", hostname: "app.nexora.app" }, null],
  ["sandbox preview host skipped", { search: "?template=skincare_clinic", hostname: "3000-example.e2b.app" }, null],
  ["sandbox explicit site query wins", { search: "?site=glow-studio", hostname: "3000-example.e2b.app" }, "glow-studio"],
  ["vercel preview skipped", { search: "", hostname: "studioflow-abc123-team.vercel.app" }, null],
  ["localhost skipped", { search: "", hostname: "localhost" }, null],
  ["local ip skipped", { search: "", hostname: "127.0.0.1" }, null],
  ["single-char label skipped", { search: "", hostname: "a.nexora.app" }, null],
  ["invalid label skipped", { search: "", hostname: "-bad-.nexora.app" }, null],
  ["ChatGPT Site owner host skipped", { search: "", hostname: "nexora-one-white-label.templateapp67.chatgpt.site" }, null],
  ["ChatGPT Site explicit site query wins", { search: "?site=vijaysalojaipur", hostname: "nexora-one-white-label.templateapp67.chatgpt.site" }, "vijaysalojaipur"],
  ["Nexora salon wildcard domain", { search: "", hostname: "vijaysalojaipur.nexorasalon.online" }, "vijaysalojaipur"],
  ["Nexora apex serves owner app", { search: "", hostname: "nexorasalon.online" }, null],
  ["missing location", void 0, null],
  ["empty stub", {}, null]
];
var failed = 0;
for (const [name, loc, want] of cases) {
  const got = resolveSiteSlug(loc);
  if (got !== want) {
    failed++;
    console.error(`FAIL ${name}: got ${got}, want ${want}`);
  }
}
if (failed) {
  console.error(`${failed} subdomain cases failed`);
  process.exit(1);
}
console.log(`PASS: subdomain routing resolves all ${cases.length} cases.`);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2xpYi9yZXNvbHZlU2l0ZS50cyIsICJ2ZXJpZnktc3ViZG9tYWluLXJvdXRpbmcudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgZnVuY3Rpb24gdHJpbVNsYXNoZXMoczogdW5rbm93bik6IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgcyAhPT0gJ3N0cmluZycpIHJldHVybiAnJztcbiAgcmV0dXJuIHMucmVwbGFjZSgvXlxcLyt8XFwvKyQvZywgXCJcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlU2l0ZVNsdWcoXG4gIGlucHV0Pzogc3RyaW5nIHwgeyBob3N0bmFtZT86IHN0cmluZzsgc2VhcmNoPzogc3RyaW5nOyBwYXRobmFtZT86IHN0cmluZzsgaHJlZj86IHN0cmluZzsgb3JpZ2luPzogc3RyaW5nIH0gfCBudWxsXG4pOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKCFpbnB1dCkgcmV0dXJuIG51bGw7XG5cbiAgbGV0IGhvc3RuYW1lID0gJyc7XG4gIGxldCBzZWFyY2ggPSAnJztcbiAgbGV0IHBhdGhuYW1lID0gJyc7XG4gIGxldCBocmVmID0gJyc7XG4gIGxldCBvcmlnaW4gPSAnJztcblxuICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgIGhyZWYgPSBpbnB1dDtcbiAgICBpZiAoaW5wdXQuaW5jbHVkZXMoJz8nKSkge1xuICAgICAgY29uc3QgcGFydHMgPSBpbnB1dC5zcGxpdCgnPycpO1xuICAgICAgcGF0aG5hbWUgPSBwYXJ0c1swXTtcbiAgICAgIHNlYXJjaCA9ICc/JyArIHBhcnRzLnNsaWNlKDEpLmpvaW4oJz8nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aG5hbWUgPSBpbnB1dDtcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSAnb2JqZWN0JyAmJiBpbnB1dCAhPT0gbnVsbCkge1xuICAgIGhvc3RuYW1lID0gaW5wdXQuaG9zdG5hbWUgfHwgJyc7XG4gICAgc2VhcmNoID0gaW5wdXQuc2VhcmNoIHx8ICcnO1xuICAgIHBhdGhuYW1lID0gaW5wdXQucGF0aG5hbWUgfHwgJyc7XG4gICAgaHJlZiA9IGlucHV0LmhyZWYgfHwgJyc7XG4gICAgb3JpZ2luID0gaW5wdXQub3JpZ2luIHx8ICcnO1xuICB9XG5cbiAgaWYgKCFob3N0bmFtZSAmJiBocmVmKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHUgPSBuZXcgVVJMKGhyZWYpO1xuICAgICAgaG9zdG5hbWUgPSB1Lmhvc3RuYW1lO1xuICAgICAgaWYgKCFzZWFyY2ggJiYgdS5zZWFyY2gpIHNlYXJjaCA9IHUuc2VhcmNoO1xuICAgICAgaWYgKCFwYXRobmFtZSAmJiB1LnBhdGhuYW1lKSBwYXRobmFtZSA9IHUucGF0aG5hbWU7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBpZ25vcmVcbiAgICB9XG4gIH1cbiAgaWYgKCFob3N0bmFtZSAmJiBvcmlnaW4pIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdSA9IG5ldyBVUkwob3JpZ2luKTtcbiAgICAgIGhvc3RuYW1lID0gdS5ob3N0bmFtZTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIGlnbm9yZVxuICAgIH1cbiAgfVxuXG4gIC8vIDEuIENoZWNrIFVSTCBxdWVyeSBwYXJhbXM6ID9zaXRlPXNsdWcgb3IgP3M9c2x1ZyBvciA/c3ViZG9tYWluPXNsdWdcbiAgaWYgKHNlYXJjaCkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHNlYXJjaCk7XG4gICAgICBjb25zdCBzaXRlID0gcGFyYW1zLmdldCgnc2l0ZScpIHx8IHBhcmFtcy5nZXQoJ3MnKSB8fCBwYXJhbXMuZ2V0KCdzdWJkb21haW4nKTtcbiAgICAgIGlmIChzaXRlKSB7XG4gICAgICAgIGNvbnN0IHRyaW1tZWQgPSBzaXRlLnRyaW0oKTtcbiAgICAgICAgcmV0dXJuIHRyaW1tZWQgPyB0cmltbWVkLnRvTG93ZXJDYXNlKCkgOiBudWxsO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gaWdub3JlXG4gICAgfVxuICB9XG5cbiAgLy8gMi4gQ2hlY2sgaG9zdG5hbWUgc3ViZG9tYWluc1xuICBpZiAoaG9zdG5hbWUpIHtcbiAgICBjb25zdCBsb3dlckhvc3QgPSBob3N0bmFtZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgaWYgKFxuICAgICAgbG93ZXJIb3N0ID09PSAnbmV4b3JhLmFwcCcgfHxcbiAgICAgIGxvd2VySG9zdCA9PT0gJ3d3dy5uZXhvcmEuYXBwJyB8fFxuICAgICAgbG93ZXJIb3N0ID09PSAnbmV4b3Jhc2Fsb24ub25saW5lJyB8fFxuICAgICAgbG93ZXJIb3N0ID09PSAnd3d3Lm5leG9yYXNhbG9uLm9ubGluZScgfHxcbiAgICAgIGxvd2VySG9zdCA9PT0gJ2xvY2FsaG9zdCcgfHxcbiAgICAgIGxvd2VySG9zdCA9PT0gJzEyNy4wLjAuMScgfHxcbiAgICAgIGxvd2VySG9zdC5lbmRzV2l0aCgnLmUyYi5hcHAnKSB8fFxuICAgICAgbG93ZXJIb3N0LmVuZHNXaXRoKCcudmVyY2VsLmFwcCcpIHx8XG4gICAgICBsb3dlckhvc3QuZW5kc1dpdGgoJy5jaGF0Z3B0LnNpdGUnKVxuICAgICkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcGFydHMgPSBsb3dlckhvc3Quc3BsaXQoJy4nKTtcbiAgICAvLyBlLmcuIGdsb3ctc3R1ZGlvLm5leG9yYS5hcHAgLT4gbGVuZ3RoIDQgWydnbG93LXN0dWRpbycsICduZXhvcmEnLCAnYXBwJ11cbiAgICAvLyB2aWpheXNhbG9qYWlwdXIubmV4b3Jhc2Fsb24ub25saW5lIC0+IGxlbmd0aCAzIFsndmlqYXlzYWxvamFpcHVyJywgJ25leG9yYXNhbG9uJywgJ29ubGluZSddXG4gICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAzKSB7XG4gICAgICBjb25zdCBzdWIgPSBwYXJ0c1swXTtcbiAgICAgIGlmIChcbiAgICAgICAgc3ViICYmXG4gICAgICAgIHN1YiAhPT0gJ3d3dycgJiZcbiAgICAgICAgc3ViICE9PSAnYXBwJyAmJlxuICAgICAgICBzdWIgIT09ICdhaXMtZGV2JyAmJlxuICAgICAgICBzdWIgIT09ICdhaXMtcHJlJyAmJlxuICAgICAgICBzdWIgIT09ICdzdHVkaW9mbG93JyAmJlxuICAgICAgICBzdWIubGVuZ3RoID4gMSAmJlxuICAgICAgICAvXlthLXowLTldKFthLXowLTktXSpbYS16MC05XSk/JC8udGVzdChzdWIpXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIHN1YjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyAzLiBDaGVjayBwYXRobmFtZVxuICBpZiAocGF0aG5hbWUpIHtcbiAgICBjb25zdCBjbGVhbiA9IHRyaW1TbGFzaGVzKHBhdGhuYW1lKTtcbiAgICBpZiAoY2xlYW4pIHtcbiAgICAgIGNvbnN0IHBhcnRzID0gY2xlYW4uc3BsaXQoJy8nKTtcbiAgICAgIGNvbnN0IGZpcnN0ID0gcGFydHNbMF0/LnRvTG93ZXJDYXNlKCk7XG4gICAgICBpZiAoXG4gICAgICAgIGZpcnN0ICYmXG4gICAgICAgIGZpcnN0ICE9PSAnYXBwJyAmJlxuICAgICAgICBmaXJzdCAhPT0gJ2ludml0ZScgJiZcbiAgICAgICAgZmlyc3QgIT09ICdhcGknICYmXG4gICAgICAgIGZpcnN0Lmxlbmd0aCA+IDEgJiZcbiAgICAgICAgL15bYS16MC05XShbYS16MC05LV0qW2EtejAtOV0pPyQvLnRlc3QoZmlyc3QpXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIGZpcnN0O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIiwgImltcG9ydCB7cmVzb2x2ZVNpdGVTbHVnfSBmcm9tICcuLi9zcmMvbGliL3Jlc29sdmVTaXRlJztcbmNvbnN0IGNhc2VzOiBBcnJheTxbc3RyaW5nLCBhbnksIHN0cmluZyB8IG51bGxdPiA9IFtcbiAgWydxdWVyeSBwYXJhbSB3aW5zJywge3NlYXJjaDogJz9zaXRlPWdsb3ctc3R1ZGlvJywgaG9zdG5hbWU6ICdvdGhlci5leGFtcGxlLmNvbSd9LCAnZ2xvdy1zdHVkaW8nXSxcbiAgWydxdWVyeSBzbHVncyBhcmUgY2FzZS1pbnNlbnNpdGl2ZScsIHtzZWFyY2g6ICc/c2l0ZT1Sb29wLU1haGFsJywgaG9zdG5hbWU6ICduZXhvcmEuYXBwJ30sICdyb29wLW1haGFsJ10sXG4gIFsncXVlcnkgb24gYXBleCBob3N0Jywge3NlYXJjaDogJz9zaXRlPWEnLCBob3N0bmFtZTogJ25leG9yYS5hcHAnfSwgJ2EnXSxcbiAgWydzdWJkb21haW4gYWxpYXMnLCB7c2VhcmNoOiAnJywgaG9zdG5hbWU6ICdnbG93LXN0dWRpby5uZXhvcmEuYXBwJ30sICdnbG93LXN0dWRpbyddLFxuICBbJ2hvc3RuYW1lIGZyb20gaHJlZicsIHtzZWFyY2g6ICcnLCBocmVmOiAnaHR0cHM6Ly9nbG93LXN0dWRpby5uZXhvcmEuYXBwLz9hcHA9MSd9LCAnZ2xvdy1zdHVkaW8nXSxcbiAgWydob3N0bmFtZSBmcm9tIG9yaWdpbicsIHtvcmlnaW46ICdodHRwczovL2dsb3ctc3R1ZGlvLm5leG9yYS5hcHAnfSwgJ2dsb3ctc3R1ZGlvJ10sXG4gIFsnYXBleCBzZXJ2ZXMgb3duZXIgYXBwJywge3NlYXJjaDogJycsIGhvc3RuYW1lOiAnbmV4b3JhLmFwcCd9LCBudWxsXSxcbiAgWyd3d3cgc2VydmVzIG93bmVyIGFwcCcsIHtzZWFyY2g6ICcnLCBob3N0bmFtZTogJ3d3dy5uZXhvcmEuYXBwJ30sIG51bGxdLFxuICBbJ3Jlc2VydmVkIGxhYmVscyBza2lwcGVkJywge3NlYXJjaDogJycsIGhvc3RuYW1lOiAnYXBwLm5leG9yYS5hcHAnfSwgbnVsbF0sXG4gIFsnc2FuZGJveCBwcmV2aWV3IGhvc3Qgc2tpcHBlZCcsIHtzZWFyY2g6ICc/dGVtcGxhdGU9c2tpbmNhcmVfY2xpbmljJywgaG9zdG5hbWU6ICczMDAwLWV4YW1wbGUuZTJiLmFwcCd9LCBudWxsXSxcbiAgWydzYW5kYm94IGV4cGxpY2l0IHNpdGUgcXVlcnkgd2lucycsIHtzZWFyY2g6ICc/c2l0ZT1nbG93LXN0dWRpbycsIGhvc3RuYW1lOiAnMzAwMC1leGFtcGxlLmUyYi5hcHAnfSwgJ2dsb3ctc3R1ZGlvJ10sXG4gIFsndmVyY2VsIHByZXZpZXcgc2tpcHBlZCcsIHtzZWFyY2g6ICcnLCBob3N0bmFtZTogJ3N0dWRpb2Zsb3ctYWJjMTIzLXRlYW0udmVyY2VsLmFwcCd9LCBudWxsXSxcbiAgWydsb2NhbGhvc3Qgc2tpcHBlZCcsIHtzZWFyY2g6ICcnLCBob3N0bmFtZTogJ2xvY2FsaG9zdCd9LCBudWxsXSxcbiAgWydsb2NhbCBpcCBza2lwcGVkJywge3NlYXJjaDogJycsIGhvc3RuYW1lOiAnMTI3LjAuMC4xJ30sIG51bGxdLFxuICBbJ3NpbmdsZS1jaGFyIGxhYmVsIHNraXBwZWQnLCB7c2VhcmNoOiAnJywgaG9zdG5hbWU6ICdhLm5leG9yYS5hcHAnfSwgbnVsbF0sXG4gIFsnaW52YWxpZCBsYWJlbCBza2lwcGVkJywge3NlYXJjaDogJycsIGhvc3RuYW1lOiAnLWJhZC0ubmV4b3JhLmFwcCd9LCBudWxsXSxcblxuICBbJ0NoYXRHUFQgU2l0ZSBvd25lciBob3N0IHNraXBwZWQnLCB7c2VhcmNoOiAnJywgaG9zdG5hbWU6ICduZXhvcmEtb25lLXdoaXRlLWxhYmVsLnRlbXBsYXRlYXBwNjcuY2hhdGdwdC5zaXRlJ30sIG51bGxdLFxuICBbJ0NoYXRHUFQgU2l0ZSBleHBsaWNpdCBzaXRlIHF1ZXJ5IHdpbnMnLCB7c2VhcmNoOiAnP3NpdGU9dmlqYXlzYWxvamFpcHVyJywgaG9zdG5hbWU6ICduZXhvcmEtb25lLXdoaXRlLWxhYmVsLnRlbXBsYXRlYXBwNjcuY2hhdGdwdC5zaXRlJ30sICd2aWpheXNhbG9qYWlwdXInXSxcbiAgWydOZXhvcmEgc2Fsb24gd2lsZGNhcmQgZG9tYWluJywge3NlYXJjaDogJycsIGhvc3RuYW1lOiAndmlqYXlzYWxvamFpcHVyLm5leG9yYXNhbG9uLm9ubGluZSd9LCAndmlqYXlzYWxvamFpcHVyJ10sXG4gIFsnTmV4b3JhIGFwZXggc2VydmVzIG93bmVyIGFwcCcsIHtzZWFyY2g6ICcnLCBob3N0bmFtZTogJ25leG9yYXNhbG9uLm9ubGluZSd9LCBudWxsXSxcbiAgWydtaXNzaW5nIGxvY2F0aW9uJywgdW5kZWZpbmVkLCBudWxsXSxcbiAgWydlbXB0eSBzdHViJywge30sIG51bGxdLFxuXTtcbmxldCBmYWlsZWQgPSAwO1xuZm9yIChjb25zdCBbbmFtZSwgbG9jLCB3YW50XSBvZiBjYXNlcykge1xuICBjb25zdCBnb3QgPSByZXNvbHZlU2l0ZVNsdWcobG9jKTtcbiAgaWYgKGdvdCAhPT0gd2FudCkgeyBmYWlsZWQrKzsgY29uc29sZS5lcnJvcihgRkFJTCAke25hbWV9OiBnb3QgJHtnb3R9LCB3YW50ICR7d2FudH1gKTsgfVxufVxuaWYgKGZhaWxlZCkgeyBjb25zb2xlLmVycm9yKGAke2ZhaWxlZH0gc3ViZG9tYWluIGNhc2VzIGZhaWxlZGApOyBwcm9jZXNzLmV4aXQoMSk7IH1cbmNvbnNvbGUubG9nKGBQQVNTOiBzdWJkb21haW4gcm91dGluZyByZXNvbHZlcyBhbGwgJHtjYXNlcy5sZW5ndGh9IGNhc2VzLmApO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFPLFNBQVMsWUFBWSxHQUFvQjtBQUM5QyxNQUFJLE9BQU8sTUFBTSxTQUFVLFFBQU87QUFDbEMsU0FBTyxFQUFFLFFBQVEsY0FBYyxFQUFFO0FBQ25DO0FBRU8sU0FBUyxnQkFDZCxPQUNlO0FBQ2YsTUFBSSxDQUFDLE1BQU8sUUFBTztBQUVuQixNQUFJLFdBQVc7QUFDZixNQUFJLFNBQVM7QUFDYixNQUFJLFdBQVc7QUFDZixNQUFJLE9BQU87QUFDWCxNQUFJLFNBQVM7QUFFYixNQUFJLE9BQU8sVUFBVSxVQUFVO0FBQzdCLFdBQU87QUFDUCxRQUFJLE1BQU0sU0FBUyxHQUFHLEdBQUc7QUFDdkIsWUFBTSxRQUFRLE1BQU0sTUFBTSxHQUFHO0FBQzdCLGlCQUFXLE1BQU0sQ0FBQztBQUNsQixlQUFTLE1BQU0sTUFBTSxNQUFNLENBQUMsRUFBRSxLQUFL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
