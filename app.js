"use strict";
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
let sector = "all",
  expanded = false,
  activeDivision = "TMT",
  lastTrigger;
const dialog = $("#detail-dialog");
const staticSite =
  document.querySelector('meta[name="wm-static"]')?.content === "true";
let eventsView = "upcoming",
  EVENTS = typeof INITIAL_EVENTS !== "undefined" ? INITIAL_EVENTS : [],
  ANNOUNCEMENTS =
    typeof INITIAL_ANNOUNCEMENTS !== "undefined" ? INITIAL_ANNOUNCEMENTS : [],
  serverContent = false;

function renderSectorFilters() {
  const labels = [
    ...new Set([
      ...DIVISIONS.map((d) => d.name),
      ...REPORTS.map((r) => r.sector),
    ]),
  ];
  $(".sector-filters").innerHTML = ["all", ...labels]
    .map(
      (label) =>
        `<button class="filter ${sector === label ? "active" : ""}" data-sector="${esc(label)}" aria-pressed="${sector === label}">${label === "all" ? "All research" : esc(label)}</button>`,
    )
    .join("");
}
function renderPeriods() {
  const selected = $("#quarter-filter").value;
  $("#quarter-filter").innerHTML =
    '<option value="all">All periods</option>' +
    [...new Set(REPORTS.map((r) => r.period))]
      .map((p) => `<option>${esc(p)}</option>`)
      .join("");
  if (["all", ...REPORTS.map((r) => r.period)].includes(selected))
    $("#quarter-filter").value = selected;
}
function renderReports() {
  const term = $("#report-search").value.trim().toLocaleLowerCase();
  const period = $("#quarter-filter").value;
  const matched = REPORTS.filter(
    (r) =>
      (sector === "all" ||
        r.sector === sector ||
        r.sectors?.includes(sector)) &&
      (period === "all" || r.period === period) &&
      [
        r.title,
        r.sector,
        r.originalSector || "",
        r.description,
        r.period,
        ...r.companies,
        ...r.team,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(term),
  );
  const showEverything =
    expanded || sector !== "all" || term || period !== "all";
  const shown = showEverything ? matched : matched.slice(0, 3);
  $("#report-grid").innerHTML = shown.length
    ? shown
        .map(
          (r) =>
            `<button class="report-card" data-report="${r.id}" aria-label="Open ${esc(r.sector)} report, ${esc(r.period)}"><span class="report-cover" style="display:block"><img src="${esc(r.cover)}" alt="${esc(r.coverAlt || r.sector + " research")}" loading="lazy"><span class="report-image-label">${esc(r.originalSector || r.sector)}</span><span class="cover-open" aria-hidden="true">↗</span></span><span class="report-meta"><span>${esc(r.period)}</span><span>${r.publicationType === "stock_pitch" ? "Stock pitch" : r.archiveKind === "release" ? "Research release" : r.archiveKind === "announcement" ? "Deal announcement" : r.archiveKind === "spotlight" ? "Deal spotlight" : "Sector report"}</span></span><h3 class="report-title">${esc(r.title)}</h3><p class="report-description">${esc(r.description)}</p><span class="report-format">${r.pdf ? `${r.pages} ${r.sourceType === "instagram-slides" ? (r.pages === 1 ? "slide" : "slides") : "pages"} · PDF` : esc(r.format)} <span aria-hidden="true">↗</span></span></button>`,
        )
        .join("")
    : '<div class="no-results"><p>No reports match your search.</p><button class="text-link" data-reset>Clear filters <span aria-hidden="true">↗</span></button></div>';
  $("#report-count").textContent =
    `Showing ${shown.length} of ${matched.length} ${matched.length === 1 ? "report" : "reports"}`;
  $("#show-all").hidden =
    matched.length <= 3 ||
    sector !== "all" ||
    Boolean(term) ||
    period !== "all";
  $("#show-all").innerHTML = expanded
    ? 'Show latest reports <span aria-hidden="true">↑</span>'
    : 'View the research archive <span aria-hidden="true">↗</span>';
}
function setSector(value) {
  sector = value;
  $$(".filter").forEach((b) => {
    b.classList.toggle("active", b.dataset.sector === value);
    b.setAttribute("aria-pressed", String(b.dataset.sector === value));
  });
  renderReports();
}
function resetFilters() {
  $("#report-search").value = "";
  $("#quarter-filter").value = "all";
  expanded = false;
  setSector("all");
}
function openDialog(markup, trigger) {
  lastTrigger = trigger || document.activeElement;
  $("#detail-content").innerHTML = markup;
  dialog.showModal();
  document.body.style.overflow = "hidden";
  $(".dialog-close").focus();
}
function closeDialog() {
  dialog.close();
}
dialog.addEventListener("close", () => {
  document.body.style.overflow = "";
  $("#detail-content").innerHTML = "";
  lastTrigger?.focus();
});
$(".dialog-close").addEventListener("click", closeDialog);
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      closeDialog();
  }
});
function openReport(id, trigger) {
  const r = REPORTS.find((r) => r.id === id);
  if (!r) return;
  const actions = r.pdf
    ? `<a class="button primary" href="${esc(r.pdf)}" target="_blank" rel="noopener noreferrer">Read research PDF <span aria-hidden="true">↗</span></a><a class="text-link" href="${esc(r.pdf)}" download="Warwick-MA-${r.id}.pdf">Download PDF <span aria-hidden="true">↓</span></a>`
    : '<p class="modal-footnote">This PDF is not available yet.</p>';
  openDialog(
    `<div class="dialog-main"><p class="eyebrow">${esc(r.sector)} / ${esc(r.period)} / ${r.pdf ? r.pages + (r.sourceType === "instagram-slides" ? " original slides" : " pages") : "Preview"}</p><h2 id="detail-title">${esc(r.title)}</h2><p class="dialog-summary">${esc(r.summary)}</p><div class="dialog-actions">${actions}<button class="text-link" data-share="${r.id}">Share report <span aria-hidden="true">↗</span></button></div><p class="share-feedback" role="status" aria-live="polite"></p>${r.pdf ? "" : '<p class="modal-footnote">The document will appear here once it has been uploaded.</p>'}<p class="dialog-credits">${r.team.length ? "Research team: " + r.team.map(esc).join(" · ") : ""}${r.source ? `<br><a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;text-underline-offset:3px">Original society publication ↗</a>` : ""}</p></div>${r.pdf ? `<iframe class="pdf-viewer" src="${esc(r.pdf)}#toolbar=0&navpanes=0" title="${esc(r.sector)} ${esc(r.period)} research PDF"></iframe>` : ""}`,
    trigger,
  );
}
function openPitch(id, trigger) {
  const p = PITCHES[id];
  if (!p) return;
  openDialog(
    `<div class="dialog-main"><p class="eyebrow">Member pitch / ${esc(p.event)}</p><h2 id="detail-title">${esc(p.company)}</h2><p class="dialog-summary">${esc(p.title)}</p><div class="pitch-stats"><div><span>${esc(p.ticker)}</span><strong>${esc(p.view)}</strong></div><div><span>Target at presentation</span><strong>${p.target}</strong></div>${p.result ? `<div><span>Competition result</span><strong>${p.result}</strong></div>` : ""}</div><p class="dialog-summary">${esc(p.summary)}</p><ul class="thesis-points">${p.points.map((s) => `<li>${esc(s)}</li>`).join("")}</ul><div class="dialog-actions"><a class="button primary" href="${p.source}" target="_blank" rel="noopener noreferrer">Read the author's account <span aria-hidden="true">↗</span></a></div><p class="dialog-credits">${esc(p.credit)}. Selected member work, rather than an official society investment recommendation. The public author account is the source; a pitch deck has not been supplied.</p><p class="modal-footnote">Historical analysis and targets, as presented. Not current prices or current investment recommendations.</p></div>`,
    trigger,
  );
}
function renderDivisions() {
  $("#division-list").innerHTML = DIVISIONS.map(
    (d) =>
      `<button class="division-item ${activeDivision === d.name ? "active" : ""}" data-division="${esc(d.name)}" aria-pressed="${activeDivision === d.name}" aria-controls="division-preview"><span class="division-number">${d.number}</span><h3>${esc(d.name)}</h3><span class="division-arrow" aria-hidden="true">↗</span></button>`,
  ).join("");
  const d = DIVISIONS.find((d) => d.name === activeDivision),
    reports = REPORTS.filter(
      (r) => r.sector === d.name || r.sectors?.includes(d.name),
    );
  $("#division-preview").innerHTML =
    `<p class="eyebrow">${esc(d.full)}</p><h3>${esc(d.description)}</h3><p>${reports.length} ${reports.length === 1 ? "publication" : "publications"} in the research library.</p><a class="text-link" href="#research" data-division-research="${esc(d.name)}">Explore the research <span aria-hidden="true">↗</span></a>`;
}
document.addEventListener("click", async (event) => {
  const eventCard = event.target.closest("[data-event]");
  if (eventCard) openEvent(eventCard.dataset.event, eventCard);
  const announcement = event.target.closest("[data-announcement]");
  if (announcement)
    openAnnouncement(announcement.dataset.announcement, announcement);
  const report = event.target.closest("[data-report]");
  if (report) openReport(report.dataset.report, report);
  const pitch = event.target.closest("[data-pitch]");
  if (pitch) openPitch(pitch.dataset.pitch, pitch);
  const filter = event.target.closest("[data-sector]");
  if (filter) setSector(filter.dataset.sector);
  const div = event.target.closest("[data-division]");
  if (div) {
    activeDivision = div.dataset.division;
    renderDivisions();
    $(`[data-division="${CSS.escape(activeDivision)}"]`).focus();
  }
  const explore = event.target.closest("[data-division-research]");
  if (explore) {
    expanded = true;
    $("#report-search").value = "";
    $("#quarter-filter").value = "all";
    setSector(explore.dataset.divisionResearch);
  }
  if (event.target.closest("[data-reset]")) resetFilters();
  const share = event.target.closest("[data-share]");
  if (share) {
    const url = new URL(location.href);
    url.searchParams.set("report", share.dataset.share);
    url.hash = "research";
    const status = $(".share-feedback");
    status.innerHTML = `<label>Report link <input class="share-url" aria-label="Report link" value="${esc(url.href)}" readonly></label>`;
    $(".share-url", status).select();
  }
});
$("#show-all").addEventListener("click", () => {
  expanded = !expanded;
  renderReports();
});
$("#report-search").addEventListener("input", renderReports);
$("#quarter-filter").addEventListener("change", renderReports);
$("#clear-search").addEventListener("click", resetFilters);
$(".search-toggle").addEventListener("click", () => {
  const panel = $("#search-panel");
  panel.hidden = !panel.hidden;
  $(".search-toggle").setAttribute("aria-expanded", String(!panel.hidden));
  if (!panel.hidden) $("#report-search").focus();
});
$$("[data-pitch-tab]").forEach((button) =>
  button.addEventListener("click", () => {
    const upcoming = button.dataset.pitchTab === "upcoming";
    $("#past-pitches").hidden = upcoming;
    $("#upcoming-pitches").hidden = !upcoming;
    $$("[data-pitch-tab]").forEach((b) => {
      const active = b === button;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
  }),
);
$(".menu-toggle").addEventListener("click", () => {
  const open = $(".menu-toggle").getAttribute("aria-expanded") !== "true";
  $(".menu-toggle").setAttribute("aria-expanded", String(open));
  $(".menu-toggle").setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
  $("#main-nav").classList.toggle("open", open);
});
$$("#main-nav a").forEach((a) =>
  a.addEventListener("click", () => {
    $("#main-nav").classList.remove("open");
    $(".menu-toggle").setAttribute("aria-expanded", "false");
    $(".menu-toggle").setAttribute("aria-label", "Open navigation");
  }),
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !dialog.open) {
    $("#main-nav").classList.remove("open");
    $(".menu-toggle").setAttribute("aria-expanded", "false");
    $(".menu-toggle").setAttribute("aria-label", "Open navigation");
  }
});
$("#year").textContent = String(new Date().getFullYear());
renderSectorFilters();
renderPeriods();
renderReports();
renderDivisions();
const linkedReport = new URL(location.href).searchParams.get("report");
if (linkedReport) openReport(linkedReport);
let linkedReportHandled = dialog.open;

const eventTypes = {
  stock_pitch: "Stock pitch",
  competition: "Competition",
  speaker: "Speaker event",
  workshop: "Workshop",
  social: "Social",
};
function londonNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function isUpcoming(event) {
  return `${event.date}T${event.time || "23:59"}` >= londonNow();
}
function eventDate(event) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(event.date + "T12:00:00Z"));
}
function eventCard(event) {
  return `<button class="event-card" data-event="${event.id}"><span class="event-photo"><img src="${esc(event.cover)}" alt="${esc(event.coverAlt || "Warwick M&A Group event")}" loading="lazy"><span class="event-date-label">${esc(eventDate(event))}</span></span><span class="event-card-meta">${esc(eventTypes[event.eventType] || "Event")} · ${esc(event.division === "all" ? "All divisions" : event.division)}</span><span class="event-card-title">${esc(event.title)}</span><span class="event-card-location">${esc(event.location)}${event.time ? " · " + esc(event.time) + " London time" : ""}<span aria-hidden="true">↗</span></span></button>`;
}
function renderEvents() {
  const uploadedPitches = REPORTS.filter(
    (r) => r.publicationType === "stock_pitch",
  );
  $("#published-pitches").hidden = !uploadedPitches.length;
  $("#published-pitches").innerHTML =
    `<h3 class="published-pitches-title">Published pitches</h3><div class="event-grid">${uploadedPitches.map((r) => `<button class="event-card" data-report="${r.id}"><span class="event-photo"><img src="${esc(r.cover)}" alt="${esc(r.coverAlt || r.sector)}" loading="lazy"></span><span class="event-card-meta">${esc(r.sector)} · ${esc(r.period)}</span><span class="event-card-title">${esc(r.title)}</span><span class="event-card-location">Read the pitch <span aria-hidden="true">↗</span></span></button>`).join("")}</div>`;
  const division = $("#event-division").value;
  const items = EVENTS.filter(
    (e) =>
      (eventsView === "upcoming" ? isUpcoming(e) : !isUpcoming(e)) &&
      (division === "all" || e.division === "all" || e.division === division),
  ).sort((a, b) =>
    eventsView === "upcoming"
      ? a.date.localeCompare(b.date) ||
        String(a.time).localeCompare(String(b.time))
      : b.date.localeCompare(a.date) ||
        String(b.time).localeCompare(String(a.time)),
  );
  $("#event-grid").innerHTML = items.length
    ? items.map(eventCard).join("")
    : `<div class="events-empty"><span>${eventsView === "upcoming" ? "No upcoming dates announced." : "No past events in this view."}</span><p>${eventsView === "upcoming" ? "New events will appear here when the group publishes them." : "Choose another division to explore the archive."}</p></div>`;
  const pitches = EVENTS.filter(
    (e) =>
      isUpcoming(e) && ["stock_pitch", "competition"].includes(e.eventType),
  ).sort((a, b) => a.date.localeCompare(b.date));
  $("#upcoming-pitches").classList.toggle(
    "has-events",
    Boolean(pitches.length),
  );
  $("#upcoming-pitches").innerHTML = pitches.length
    ? `<div class="event-grid">${pitches.map(eventCard).join("")}</div>`
    : '<span class="upcoming-symbol" aria-hidden="true">↗</span><div><p class="eyebrow">Next on the calendar</p><h3>Next pitch: to be announced.</h3><p>Follow the group for the next pitch or competition.</p><a class="button light" href="https://www.instagram.com/warwickmagroup/" target="_blank" rel="noopener noreferrer">Follow the next announcement <span aria-hidden="true">↗</span></a></div>';
}
function openEvent(id, trigger) {
  const e = EVENTS.find((e) => e.id === id);
  if (!e) return;
  openDialog(
    `<img class="event-dialog-cover" src="${esc(e.cover)}" alt="${esc(e.coverAlt || "Warwick M&A Group event")}"><div class="dialog-main"><p class="eyebrow">${esc(eventTypes[e.eventType] || "Event")} / ${esc(e.division === "all" ? "All divisions" : e.division)} / ${isUpcoming(e) ? "Upcoming" : "Past event"}</p><h2 id="detail-title">${esc(e.title)}</h2><p class="event-detail-date">${esc(eventDate(e))}${e.time ? " · " + esc(e.time) + " Europe/London" : ""}<br>${esc(e.location)}</p><p class="dialog-summary event-description">${esc(e.description)}</p><div class="dialog-actions">${e.link ? `<a class="button primary" href="${esc(e.link)}" target="_blank" rel="noopener noreferrer">${isUpcoming(e) ? "Event details & registration" : "Original event announcement"} <span aria-hidden="true">↗</span></a>` : ""}${serverContent || e.calendarUrl ? `<a class="text-link" href="${esc(e.calendarUrl || `/api/events/${e.id}/calendar`)}" download>Add to calendar <span aria-hidden="true">↓</span></a>` : ""}</div></div>`,
    trigger,
  );
}
function renderAnnouncements() {
  $("#announcements").hidden = !ANNOUNCEMENTS.length;
  $("#announcement-list").innerHTML = ANNOUNCEMENTS.map(
    (a) =>
      `<button class="announcement-row" data-announcement="${a.id}"><img src="${esc(a.cover)}" alt="" loading="lazy"><span><span class="eyebrow">${esc(a.division === "all" ? "All divisions" : a.division)}</span><strong>${esc(a.title)}</strong></span><span aria-hidden="true">↗</span></button>`,
  ).join("");
  $("#desk-line").innerHTML = ANNOUNCEMENTS.length
    ? `<button class="desk-announcement" data-announcement="${ANNOUNCEMENTS[0].id}">${esc(ANNOUNCEMENTS[0].title)} <span aria-hidden="true">↗</span></button>`
    : "Sector reports. Investment ideas. The thinking behind them.";
}
function openAnnouncement(id, trigger) {
  const a = ANNOUNCEMENTS.find((a) => a.id === id);
  if (!a) return;
  openDialog(
    `<img class="event-dialog-cover" src="${esc(a.cover)}" alt="${esc(a.coverAlt || "Warwick M&A Group announcement")}"><div class="dialog-main"><p class="eyebrow">Announcement / ${esc(a.division === "all" ? "All divisions" : a.division)}</p><h2 id="detail-title">${esc(a.title)}</h2><p class="dialog-summary event-description">${esc(a.description)}</p>${a.link ? `<div class="dialog-actions"><a class="button primary" href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">Further information <span aria-hidden="true">↗</span></a></div>` : ""}</div>`,
    trigger,
  );
}
async function loadPublicContent() {
  if (staticSite || location.protocol === "file:") return;
  try {
    const response = await fetch("/api/content", { cache: "no-store" });
    if (!response.ok) return;
    const content = await response.json();
    if (!Array.isArray(content.reports)) return;
    REPORTS = content.reports;
    renderSectorFilters();
    EVENTS = content.events;
    ANNOUNCEMENTS = content.announcements;
    serverContent = true;
    const selected = $("#quarter-filter").value;
    $("#quarter-filter").innerHTML =
      '<option value="all">All periods</option>' +
      [...new Set(REPORTS.map((r) => r.period))]
        .map((p) => `<option>${esc(p)}</option>`)
        .join("");
    if (["all", ...REPORTS.map((r) => r.period)].includes(selected))
      $("#quarter-filter").value = selected;
    renderReports();
    renderDivisions();
    renderEvents();
    renderAnnouncements();
    if (linkedReport && !linkedReportHandled) {
      linkedReportHandled = true;
      if (!dialog.open) openReport(linkedReport);
    }
  } catch {
    /* Retain the bundled research when a static-only preview has no API. */
  }
}
$$("[data-event-tab]").forEach((button) =>
  button.addEventListener("click", () => {
    eventsView = button.dataset.eventTab;
    $$("[data-event-tab]").forEach((b) => {
      b.classList.toggle("active", b === button);
      b.setAttribute("aria-pressed", String(b === button));
    });
    renderEvents();
  }),
);
$("#event-division").addEventListener("change", renderEvents);
renderEvents();
renderAnnouncements();
loadPublicContent();
window.addEventListener("focus", () => {
  if (!dialog.open) loadPublicContent();
});
setInterval(() => {
  if (!document.hidden && !dialog.open) loadPublicContent();
}, 60000);
