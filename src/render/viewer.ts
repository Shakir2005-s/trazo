// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

/** Theme toggle and full screen. Pan and zoom live in a later task. */
export const VIEWER_SCRIPT = `(function () {
  var root = document.documentElement;
  var theme = document.getElementById("theme");
  var full = document.getElementById("fullscreen");
  var label = function (button, text) {
    button.setAttribute("aria-label", text);
    button.setAttribute("title", text);
  };
  theme.addEventListener("click", function () {
    var dark = root.getAttribute("data-theme") !== "dark";
    root.setAttribute("data-theme", dark ? "dark" : "light");
    label(theme, dark ? "Switch to light theme" : "Switch to dark theme");
  });
  if (!root.requestFullscreen) {
    full.hidden = true;
    return;
  }
  full.addEventListener("click", function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else root.requestFullscreen();
  });
  document.addEventListener("fullscreenchange", function () {
    var on = Boolean(document.fullscreenElement);
    root.classList.toggle("is-fullscreen", on);
    label(full, on ? "Exit full screen" : "Enter full screen");
  });
})();`;
