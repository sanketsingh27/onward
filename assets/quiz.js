/* Course quiz widget — dependency-free.
   Drop a <script class="quiz-data" type="application/json">{...}</script>
   anywhere; it is replaced with an interactive, immediate-feedback quiz.

   Schema:
   {
     "title": "Check yourself",
     "questions": [
       {
         "prompt": "Which binding exposes the feed URLs?",
         "options": [
           { "text": "BOARD_DB", "correct": true,  "why": "It stores the boards table." },
           { "text": "APP_DB",   "correct": false, "why": "APP_DB holds openings, not board config." }
         ]
       }
     ]
   }
*/
(function () {
  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render(data, root) {
    var state = { answered: 0, correct: 0 };
    root.className = "quiz-root";

    var head = h("div", "quiz-head");
    head.appendChild(h("h3", "quiz-title", data.title || "Check yourself"));
    var score = h("div", "quiz-score", "Score: 0 / 0");
    head.appendChild(score);
    root.appendChild(head);

    data.questions.forEach(function (q, qi) {
      var qEl = h("div", "quiz-q");
      qEl.appendChild(h("p", "quiz-prompt", String(qi + 1) + ". " + q.prompt));
      var opts = h("div", "quiz-opts");
      var done = false;

      q.options.forEach(function (opt) {
        var btn = h("button", "quiz-opt", opt.text);
        btn.type = "button";
        btn.addEventListener("click", function () {
          if (done) return;
          done = true;
          state.answered += 1;
          if (opt.correct) state.correct += 1;

          Array.prototype.forEach.call(opts.children, function (b, bi) {
            b.disabled = true;
            var o = q.options[bi];
            if (o.correct) b.classList.add("is-correct");
            else if (bi === q.options.indexOf(opt)) b.classList.add("is-wrong");
            else b.classList.add("is-dim");
          });

          var fb = h("p", "quiz-feedback",
            (opt.correct ? "Correct. " : "Not quite. ") + opt.why);
          fb.classList.add(opt.correct ? "good" : "bad");
          opts.appendChild(fb);

          score.textContent = "Score: " + state.correct + " / " + state.answered;
        });
        opts.appendChild(btn);
      });

      qEl.appendChild(opts);
      root.appendChild(qEl);
    });

    var reset = h("button", "quiz-reset", "Try again");
    reset.type = "button";
    reset.addEventListener("click", function () { location.reload(); });
    root.appendChild(reset);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("script.quiz-data").forEach(function (s) {
      var data;
      try {
        data = JSON.parse(s.textContent);
      } catch (e) {
        console.error("Invalid quiz data:", e);
        return;
      }
      var root = document.createElement("div");
      s.replaceWith(root);
      render(data, root);
    });
  });
})();
