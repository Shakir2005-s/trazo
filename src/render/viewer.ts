// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Heidenber Palacio Garzón

/** Theme toggle and fit/actual-size switch. Pan and zoom live in a later task. */
export const VIEWER_SCRIPT = `(function () {
  var root = document.documentElement;
  var main = document.querySelector("main");
  var stage = document.querySelector(".stage");
  var svg = stage.querySelector("svg.diagram");
  var size = svg.viewBox.baseVal;
  document.getElementById("theme").addEventListener("click", function () {
    root.setAttribute("data-theme", root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
  document.getElementById("fit").addEventListener("click", function () {
    var actual = main.classList.toggle("actual");
    stage.style.width = actual ? size.width + "px" : "";
    if (!actual) main.scrollTo(0, 0);
  });
})();`;
