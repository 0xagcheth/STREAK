Original prompt: анимация. добавь больше анимация и элементов в комекс стелистике. Различные эффекты прибавление очков нужно более явно визуализировать и использовать шрифт стилизованный под комикс стилистику.

- Initialized `progress.md` for this task.
- Plan:
  - Increase comic-style typography and decorative UI styling.
  - Add stronger score gain visual effects (`+points`) in board and player area.
  - Enable/expand existing animation effects currently disabled in JS perf profile.
  - Run Playwright client checks and review screenshots + text/console output.

- Implemented:
  - Added comic decorative badges (`POW!`, `ZAP!`) and a dedicated `scoreBurstLayer`.
  - Switched typography to comic-oriented fonts (`Luckiest Guy`, `Bangers`, `Comic Neue`).
  - Added new score burst animations (`.score-burst`, `.sum-burst`) and stronger score float visuals.
  - Enabled fly-card + score tween animations by default (with reduced-motion fallback).
  - Hooked score delta detection to spawn explicit `+N` comic bursts per player and for human round sum.

- 2026-02-28 deck back asset update (new request):
  - Replaced `assets/card-back-heat.svg` with a new illustrated card-back style based on the provided reference:
    paper texture, corner frame marks, halftone corners, diagonal paint slashes, central lightning, and STREAK logotype.
  - Updated deck visual style in `styles.css` to remove the extra gradient overlay and show the card-back asset directly.
  - Validation: ran Playwright capture to `output/web-game-cardback/shot-{0..2}.png`; deck uses the new asset and no error logs were produced.

- 2026-02-28 deck back correction (exact source image):
  - Copied the user-provided source image directly (no redraw) to `assets/card-back-heat.png`.
  - Verified byte-identical copy via SHA-256 hash match with the original file in `~/Downloads`.
  - Updated `styles.css` deck background URL to `./assets/card-back-heat.png`.
  - Removed previous custom `assets/card-back-heat.svg` so only the exact provided asset remains in use.

- Verification:
  - Ran skill Playwright client (with sandbox escalation) and collected screenshots in `output/web-game-anim-1/`.
  - Ran an additional scripted Playwright gameplay run with real `Draw/STOP` interactions; artifacts:
    - `output/manual-check/gameplay-score-fx-0.png`
    - `output/manual-check/gameplay-score-fx-1.png`
    - `output/manual-check/errors.json` (`[]`, no console/page errors)

- TODO / next-agent ideas:
  - If required, tune burst size/position per device width to reduce overlap on very narrow screens.
  - Optionally localize toast labels (`KAPOW`, `BAM`) into Russian comic equivalents.

- Follow-up adjustment after user feedback ("too many repeating animations"):
  - Reduced animation noise and disabled repeating ambient loops.
  - Added pulse throttling (`minGap`) to prevent frequent replay on the same element/class.
  - Disabled fly-card animation by default; kept score-change visuals focused on actual `+points`.
  - Suppressed repetitive round overlays (`round-start`, `round-end`) in FX queue processing.
  - Added duplicate guard for score bursts by player/total score (`uiAnimState.lastScores`).
  - Verified with an additional automated gameplay screenshot:
    - `output/manual-check/gameplay-score-fx-reduced.png`

- Follow-up adjustment after user feedback on deck proportions/volume:
  - Fixed deck ratio to match asset (`aspect-ratio: 2 / 3`, asset is 360x540).
  - Added visual stack thickness (right + bottom card-edge lines and deeper layered shadow) to read like a near-full deck.
  - Verified with screenshot:
    - `output/manual-check/deck-proportion-volume.png`

- Iteration after user rejection of deck volume:
  - Reworked stack depth again to avoid artificial "striped block" look.
  - New approach: two offset contour layers (no center fill), so face art stays visible and deck reads as stacked cards.
  - Verified:
    - `output/manual-check/deck-proportion-volume-v3.png`
    - `output/manual-check/deck-only-v3.png`

- Follow-up request: shuffle animation at the end of every round.
  - Added deck shuffle pulse on `round-end` FX event:
    - `pulseClass(deckStack, 'fx-deck-shuffle', 520, 720)`
  - Kept other noisy round overlays suppressed.
  - Verified by automated check: `sawShuffleClass: true`.

- Follow-up after "can't see shuffle":
  - Increased shuffle visibility:
    - stronger deck motion keyframes (bigger x/rotation amplitudes, longer duration),
    - animated stack depth layers (`::before`, `::after`) during shuffle,
    - added deck count pulse together with shuffle on round end.
  - Updated trigger:
    - `pulseClass(deckStack, 'fx-deck-shuffle', 760, 180)`
    - `pulseClass(deckCount, 'fx-deck-tick', 360, 180)`
  - Verified with captured frame during active shuffle:
    - `output/manual-check/round-end-shuffle-visible-v2.png`

- Follow-up request: "more realistic shuffle, optionally 3D".
  - Upgraded shuffle to 3D:
    - perspective on deck container,
    - `preserve-3d` on deck,
    - new 3D keyframes with `rotateX/rotateY/translate3d`,
    - depth-layer motion for stacked cards during shuffle.
  - Bumped asset version to avoid cache (`styles.css?v=6`, `app.js?v=6`).
  - Verified with active-shuffle captures:
    - `output/manual-check/round-end-shuffle-3d-v1.png`
    - `output/manual-check/deck-shuffle-3d-only-v1.png`

- Deck volume realism refinement (after user feedback):
  - Reworked stack layers to look less artificial.
  - Fixed rendering issue where volume layers could visually cover the face art:
    - switched depth layers to transparent fill with subtle contour + shadow only.
  - Verified:
    - `output/manual-check/deck-volume-realistic-v4.png`
    - `output/manual-check/deck-volume-realistic-only-v4.png`

- Final fix for "top card must be above all":
  - Removed pseudo stack cards from `.deck-stack` entirely (`::before`/`::after` disabled).
  - Kept volume via layered external shadows on the top card only.
  - Preserved 3D shuffle transform on the top card.
  - Bumped cache version to `v=7`.
  - Verified:
    - static clean top-card view: `output/manual-check/deck-top-card-clean-v1.png`
    - deck close-up: `output/manual-check/deck-top-card-clean-only-v1.png`
    - during shuffle: `output/manual-check/deck-top-card-clean-shuffle-v1.png`

- Follow-up request: deck card size/fit must match back asset.
  - Removed extra container border around deck face (`border: 0`).
  - Enforced exact back-art fit (`background-size: 100% 100%`, no repeat, border-box origin/clip).
  - Kept correct ratio (`aspect-ratio: 2 / 3`) and clipping.
  - Verified:
    - `output/manual-check/deck-asset-fit-v1.png`
    - `output/manual-check/deck-asset-fit-only-v1.png`

- Follow-up request: deck count should be outside, top-right, over deck.
  - Moved `#deckCount` outside `#deckStack` to avoid clipping by card overflow.
  - Positioned count as absolute badge in deck wrap (`top/right` negative offset, higher `z-index`).
  - Bumped cache version to `v=8`.
  - Verified:
    - `output/manual-check/deck-count-outside-v1.png`
    - `output/manual-check/deck-count-outside-wrap-v1.png`

- Follow-up request: remove game-screen labels/graphics (`STREAK`, `First to 200 points`, `POW!`, `ZAP!`).
  - Deleted the top header block from `index.html`.
  - Removed comic badge elements from `#game`.
  - Verified with Playwright run and screenshot review:
    - `output/web-game-cardback/shot-2.png`

- Follow-up request: keep `STREAK` + `First to 200 points` on the start screen only.
  - Restored header inside `#setup` in `index.html`.
  - Kept game screen clean: `POW!`/`ZAP!` remain removed from `#game`.

- Follow-up request: remove `Deck` caption under the deck card.
  - Removed `<div class=\"deck-label\">Deck</div>` from `index.html`.
  - Verified visually via Playwright screenshot:
    - `output/web-game-cardback/shot-2.png`

- Sidebar-only request: collapsed avatars block alignment + no avatar shadows.
  - In collapsed scoreboard state, centered avatar rows (`justify-content: center`, `align-items: center`, `gap: 0`).
  - Removed avatar shadows (`.scoreboard-avatar` and active-state avatar shadow).
  - Verified via Playwright screenshot:
    - `output/web-game-cardback/shot-2.png`

- Sidebar-only request: hide avatars when the scoreboard is expanded.
  - Added expanded-state rule to hide avatar nodes (`.scoreboard.scoreboard--expanded .scoreboard-avatar { display: none; }`).
  - Tightened expanded player row layout (`min-height: 0`, `gap: 0`) so details align cleanly without avatar column.
  - Updated fly-card target fallback in `app.js` (`getTargetForFly`) to use row element when avatar is hidden.
  - Verified with expanded-panel screenshot:
    - `output/manual-check/scoreboard-expanded-no-avatars.png`

- Sidebar-only request: expanded panel width must be no wider than a row of 7 cards.
  - Introduced sidebar mini-card geometry variables (`--score-mini-card-*`) and computed width cap:
    `--score-mini-row-w = 7 cards + 6 gaps`, `--scoreboard-panel-w = mini-row + panel paddings`.
  - Switched expanded scoreboard width sources to `--scoreboard-panel-w`.
  - Bound mini-card list/card sizes to shared variables for consistency.
  - Verified with expanded-panel screenshot:
    - `output/manual-check/scoreboard-expanded-no-avatars.png`

- Sidebar-only bugfix: 7th mini-card wrapped to next line in expanded panel.
  - Reduced expanded panel horizontal paddings to `6px` and removed horizontal paddings on expanded player rows.
  - Kept panel width cap unchanged, but reclaimed enough inner width so 7 cards fit one row.
  - Verified via targeted Playwright screenshot with injected 7 cards:
    - `output/manual-check/scoreboard-expanded-7-cards-row.png`

- Sidebar-only enhancement: smoother comic-style expand/collapse animation.
  - Added dedicated easing for panel motion (`--ease-comic-panel`) and upgraded scoreboard transitions:
    width/min-width, transform, padding, border, and shadow.
  - Added comic keyframes:
    - `scoreboard-expand-comic` (overshoot + settle)
    - `scoreboard-collapse-comic` (snap-back collapse)
  - Added detail-content reveal motion in expanded state (`translate/skew + blur` to clear).
  - Verified by Playwright computed-style probe:
    - collapsed `animationName`: `scoreboard-collapse-comic`
    - expanded `animationName`: `scoreboard-expand-comic`
  - Visual check:
    - `output/manual-check/scoreboard-expanded-comic-anim.png`

- Sidebar-only refinement after feedback ("still too sharp"): smoother motion + sketchbook-like shadow trails.
  - Increased panel transition durations for open/close smoothness (`0.62s` main width/transform track).
  - Replaced avatar hard-hide with animated collapse (opacity/scale/width/height) to avoid abrupt snap.
  - Enhanced expand/collapse keyframes with sharp offset shadow trails to mimic sketchbook stroke traces.
  - Synced deck panel movement timing and added slight drop-shadow response while sidebar expands.
  - Verified by Playwright computed styles:
    - expanded: `animationName=scoreboard-expand-comic`, animated trail `boxShadow`, avatar width/opacity near zero during motion.
    - collapsed back: `animationName=scoreboard-collapse-comic` with reverse trail shadow.
  - Visual check:
    - `output/manual-check/scoreboard-expanded-comic-anim-v2.png`

- Sidebar-only request: collapsed and expanded panel must have identical height (as expanded).
  - Added fixed shared height variable (`--scoreboard-panel-h: min(58vh, 520px)`).
  - Bound `#game .scoreboard` to this height in all states (`height/min-height/max-height`).
  - Removed per-state max-height mismatches and set rest transforms to identity to avoid visual height drift.
  - Verified via Playwright geometry after animation settle:
    - collapsed: `h=520`
    - expanded: `h=520`
    - `heightDelta=0`
  - Visual checks:
    - `output/manual-check/scoreboard-collapsed-fixed-height-v2.png`
    - `output/manual-check/scoreboard-expanded-fixed-height-v2.png`

- Sidebar-only tweak after user feedback ("panel still too long"): reduced shared fixed height slightly.
  - Updated `--scoreboard-panel-h` from `min(58vh, 520px)` to `min(56vh, 500px)`.
  - Verified geometry:
    - collapsed: `h=500`
    - expanded: `h=500`
    - `heightDelta=0`
  - Visual checks:
    - `output/manual-check/scoreboard-collapsed-fixed-height-v3.png`
    - `output/manual-check/scoreboard-expanded-fixed-height-v3.png`

- Sidebar-only request: move sidebar panel flush to top-left edge of game field.
  - Shifted scoreboard block by panel inner offset (`margin-top: -16px; margin-left: -16px`) so it hugs the game field corner.
  - Verified geometry in both states:
    - collapsed: `dx=2`, `dy=2`
    - expanded: `dx=2`, `dy=2`
    (`2px` equals game panel border thickness, so panel is flush to the inner top-left edge).
  - Visual checks:
    - `output/manual-check/scoreboard-top-left-collapsed-v1.png`
    - `output/manual-check/scoreboard-top-left-expanded-v1.png`

- 2026-03-13 mobile-first portrait refresh:
  - Added a new portrait scene asset: `assets/backgrounds/main-stage-background-portrait.svg`.
  - Switched the underground-comic theme background from the old landscape image to the new portrait composition.
  - Tuned the theme for mobile browser play:
    - smaller phone-first card geometry,
    - narrower/tighter scoreboard sizing,
    - stabilized deck position when the sidebar expands,
    - reduced panel paddings for portrait screens,
    - tightened target picker and action button layout,
    - improved very narrow screen stacking so the deck leads the screen.
  - Verification:
    - Skill Playwright smoke check after `#btnStart`:
      - `output/manual-check/portrait-skill/shot-0.png`
    - Explicit phone viewport captures (`390x844`):
      - `output/manual-check/mobile-portrait-check/start-mobile.png`
      - `output/manual-check/mobile-portrait-check/game-mobile.png`
      - `output/manual-check/mobile-portrait-check/game-mobile-score-expanded.png`
    - No captured console/page error artifacts were produced during these checks.

- Sidebar-only request: in collapsed mode avatars must align parallel to player blocks in expanded mode.
  - Added shared row height variable (`--scoreboard-row-h: 48px`).
  - Applied same row height for both states:
    - `.scoreboard-player { min-height: var(--scoreboard-row-h); }`
    - `.scoreboard.scoreboard--expanded .scoreboard-player { min-height: var(--scoreboard-row-h); }`
  - Verified with Playwright row geometry:
    - `rowTopDelta = 0` for all 8 rows (collapsed vs expanded),
    - `rowHCollapsed = rowHExpanded = 48`.
  - Visual checks:
    - `output/manual-check/scoreboard-parallel-collapsed-v1.png`
    - `output/manual-check/scoreboard-parallel-expanded-v1.png`

- Sidebar-only tweak after feedback ("still free space at bottom"): raised panel bottom a bit.
  - Reduced shared panel height from `min(56vh, 500px)` to `min(54vh, 480px)`.
  - Verified geometry remains equal in both states:
    - collapsed: `h=480`
    - expanded: `h=480`
    - `heightDelta=0`
  - Visual checks:
    - `output/manual-check/scoreboard-collapsed-fixed-height-v4.png`
    - `output/manual-check/scoreboard-expanded-fixed-height-v4.png`

- Sidebar-only tweak after user follow-up ("a bit more"): reduced panel height one more small step.
  - Updated shared height from `min(54vh, 480px)` to `min(53vh, 468px)`.
  - Verified geometry remains equal:
    - collapsed: `h=468`
    - expanded: `h=468`
    - `heightDelta=0`
  - Visual checks:
    - `output/manual-check/scoreboard-collapsed-fixed-height-v5.png`
    - `output/manual-check/scoreboard-expanded-fixed-height-v5.png`

- Sidebar-only request: make sidebar corner radius match game field radius.
  - Changed `.scoreboard` radius from `var(--r-lg)` to `var(--radius-lg)`.
  - Verified computed styles:
    - collapsed: `sbRadius=18px`, `gpRadius=18px`
    - expanded: `sbRadius=18px`, `gpRadius=18px`
  - Visual checks:
    - `output/manual-check/scoreboard-radius-match-collapsed-v1.png`
    - `output/manual-check/scoreboard-radius-match-expanded-v1.png`

- Sidebar-only request: press panel fully to the game-field edge (as continuation).
  - Updated scoreboard offsets from `-16px` to `-18px` (`margin-top` / `margin-left`) to account for panel border.
  - Verified exact flush positioning in both states:
    - collapsed: `dx=0`, `dy=0`
    - expanded: `dx=0`, `dy=0`
  - Visual checks:
    - `output/manual-check/scoreboard-flush-outer-collapsed-v1.png`
    - `output/manual-check/scoreboard-flush-outer-expanded-v1.png`

- Sidebar redesign request: panel should feel like continuation of game field and slide out like paper when clicked.
  - Reworked scoreboard visual style into a paper sheet:
    - layered paper texture background + stitched/folded right seam (`::before`),
    - pull-tab accent (`::after`),
    - smoother pull-out transitions and shadow trails.
  - Changed expansion behavior:
    - collapsed stays flush with field edge,
    - expanded translates left by `--paper-out` so the sheet "comes out" of the field.
  - Disabled deck horizontal shift on sidebar expand so the field itself stays stable while paper slides out.
  - Enabled visible overflow for parent containers required for out-of-field slide:
    - `#game.panel { overflow: visible; }`
    - `#app { overflow-x: visible; }`
  - Verification:
    - collapsed position: `dx=0`, width `56`
    - expanded position: `dx=-78`, width `134`, content visible (`firstText = "Comics: 0"`),
    - deck shift remains `0`.
  - Visual checks:
    - `output/manual-check/scoreboard-paper-collapsed-v2.png`
    - `output/manual-check/scoreboard-paper-expanded-v2.png`

- Sidebar rollback after user feedback ("moved left; make it as before").
  - Reverted paper pull-out behavior so expanded panel no longer translates left.
  - Restored in-place expansion behavior with deck shift on expand.
  - Rechecked geometry in browser probe:
    - collapsed: `dx=0`, `w=56`
    - expanded: `dx=0`, `w=134`

- Sidebar visual tweak request: keep all motion/effects, make panel feel fused with game field edge.
  - Kept expand/collapse mechanics and animations unchanged.
  - Updated only visual seam in `#game .scoreboard`:
    - left border made transparent (`border-left-color: transparent`) so field edge reads as one shared contour,
    - added subtle paper gradient layering to blend sidebar surface with game field.
  - Verification:
    - geometry unchanged (`dx=0` collapsed/expanded),
    - screenshots:
      - `output/manual-check/scoreboard-fused-collapsed-v1.png`
      - `output/manual-check/scoreboard-fused-expanded-v1.png`

- Sidebar animation refinement request: more 2D shadow feel, no panel wobble, smoother open/close.
  - Removed panel wobble from sidebar keyframes (`scoreboard-expand-comic` / `scoreboard-collapse-comic` now animate only shadows).
  - Smoothed open/close timing in `.scoreboard` transitions and keyframe easing to a non-overshooting curve.
  - Kept behavior and layout intact (same widths/positions; only animation feel updated).
  - Verification run:
    - during open/close samples, panel transform stayed constant (`matrix(1, 0, 0, 1, 0, 0)`),
    - `dx=0` for collapsed and expanded states,
    - screenshots:
      - `output/manual-check/scoreboard-2d-expanded-v1.png`
      - `output/manual-check/scoreboard-2d-collapsed-v1.png`

- Sidebar shadow tweak request: make shadow narrower and more comic-stylized.
  - Replaced wide shadow with stepped comic shadow layers:
    - collapsed/base: `2px + 4px` hard offsets,
    - expanded: `3px + 6px` hard offsets.
  - Updated expand/collapse keyframes to use the same narrow stepped shadow progression.
  - Kept panel transform/static behavior intact (no wobble): `transform` stays identity during animation.
  - Verification:
    - collapsed shadow: `2px/4px`, expanded shadow: `3px/6px`,
    - screenshots:
      - `output/manual-check/scoreboard-shadow-comic-collapsed-v1.png`
      - `output/manual-check/scoreboard-shadow-comic-expanded-v1.png`

- Sidebar follow-up tweak: shadow still too thick and open/close felt slow.
  - Reduced comic shadow thickness further:
    - base/collapsed: `1px + 2px`,
    - expanded: `1px + 3px`.
  - Sped up panel motion:
    - transitions down to `0.38s` main track,
    - keyframe durations down to `0.34s` collapse and `0.38s` expand.
  - Verification:
    - computed durations: `animationDuration=0.34s/0.38s`,
    - no wobble (`transform` remains identity),
    - screenshots:
      - `output/manual-check/scoreboard-shadow-thin-fast-collapsed-v1.png`
      - `output/manual-check/scoreboard-shadow-thin-fast-expanded-v1.png`

- Turn-highlight request: add comic-style emphasis for current player (avatar/marker).
  - Kept existing turn logic (`is-active` class) and added richer comic visuals in `styles.css`:
    - active avatar pulse ring (cyan/purple comic halo) in collapsed panel,
    - marker-like underline stroke in expanded panel,
    - small `TURN` sticker badge on active row header,
    - soft one-shot turn focus pulse via `fx-turn-in`.
  - Added new keyframes: `active-avatar-comic`, `active-marker-swipe`, `active-marker-pulse`.
  - In `app.js`, added turn-change pulse trigger in `applySnapshotAnimations`:
    - when `currentPlayerId` changes, pulse active row with `fx-turn-in`.

- Bugfix discovered during validation:
  - Bot ids were duplicated (`bot-0`, `bot-1` repeated) due sequential fillers starting from index 0 twice.
  - Added `getNextBotIndex(players)` and used it in `ensureMinPlayers` / `fillToTableSize` to guarantee unique bot ids.
  - Result: active turn marker now appears on exactly one player row.

- Cache bump:
  - Updated asset query versions in `index.html`:
    - `styles.css?v=9`
    - `app.js?v=9`

- Verification:
  - style probe confirms marker + avatar animation + TURN badge on active row,
  - active uniqueness check: `rowCount=8`, `activeCount=1`, `badgeCount=1`.
  - screenshots:
    - `output/manual-check/turn-marker-expanded-v2.png`
    - `output/manual-check/turn-marker-after-draw-v2.png`
    - `output/manual-check/turn-marker-collapsed-v2.png`

- Turn highlight style revision after feedback (comic style mismatch):
  - Removed previous TURN-sticker/gradient marker concept.
  - Implemented requested indicator: two red marker lines under active avatar in collapsed sidebar state.
  - Simplified active visuals overall:
    - active avatar keeps thin red accent ring,
    - expanded state uses minimal red row accent only.
  - Updated turn pulse tint to red (`turn-focus-comic`) to match marker lines.
  - Removed now-unused keyframes from previous marker concept.

- Verification:
  - collapsed active row pseudo-elements are present and red (`::before`, `::after`),
  - expanded active row has no pseudo marker and no TURN badge,
  - screenshots:
    - `output/manual-check/turn-lines-collapsed-v1.png`
    - `output/manual-check/turn-lines-expanded-v1.png`

- UI cleanup request: remove hint block `Your turn — Draw or STOP`.
  - Removed `<span id="currentStatus" class="game-status">` from `index.html` deck panel.
  - Verified in browser:
    - `hasStatusEl: false`
    - hint text no longer present in DOM text.
  - Screenshot: `output/manual-check/status-hint-removed-v1.png`

- Sidebar active-turn visual revision:
  - Removed active avatar highlighting (no red ring/shadow); avatar keeps default border.
  - Reworked the two under-avatar red lines into comic marker strokes:
    - stronger red gradient fill,
    - dark ink outline,
    - uneven (jagged) stroke edge via `clip-path`,
    - slight skew/rotation offset between the two lines.
  - Kept existing turn logic/classes unchanged.

- Verification:
  - active avatar computed style: `borderColor=rgb(21,17,28)`, `boxShadow=none`.
  - line strokes are present and stylized (`::before` / `::after` gradients + dark border).
  - screenshots:
    - `output/manual-check/turn-lines-comic-collapsed-v2.png`
    - `output/manual-check/turn-lines-comic-expanded-v2.png`

- Marker-line restyle after user feedback:
  - Removed jagged/clip-path shapes from active under-avatar lines.
  - Replaced with clean comic marker strokes:
    - rounded marker bars,
    - red marker gradient,
    - subtle marker texture (`repeating-linear-gradient`),
    - light ink/shadow for hand-drawn feel.
  - Kept active avatar unhighlighted.
  - Verified via screenshot: `output/manual-check/turn-lines-marker-collapsed-v1.png`.

- Marker lines style update:
  - Replaced red marker lines with simple black fat-marker strokes under active avatar.
  - Kept two-line indicator and removed colorful styling from the lines.
  - Current lines: black textured bars, height `5px`, slight rotation offsets.
  - Verification screenshot: `output/manual-check/turn-lines-black-marker-collapsed-v1.png`.

- Marker-line refinement:
  - Converted active under-avatar lines to solid black strokes (no gradient).
  - Removed rounding (`border-radius: 0`) and kept sharp slanted ends via `clip-path`.
  - Maintained two-line angled stroke composition.
  - Verification:
    - computed styles: `background-image: none`, `background-color: rgb(17,17,17)`, `border-radius: 0px`.
    - screenshot: `output/manual-check/turn-lines-black-sharp-collapsed-v1.png`.

- Expanded sidebar active marker update:
  - Added matching black sharp brush-style double strokes for active row in expanded state.
  - Same visual language as collapsed state:
    - solid black fill,
    - no gradient,
    - no rounding,
    - sharp slanted ends via `clip-path`.
  - Increased expanded-stroke size to improve visibility.
  - Screenshots:
    - `output/manual-check/turn-lines-black-sharp-expanded-v1.png`
    - `output/manual-check/turn-lines-black-sharp-expanded-v2.png`

- Expanded sidebar marker refinement per request:
  - Reworked active-row marker in expanded panel to match collapsed style direction.
  - Moved markers into `.scoreboard-player-detail` so they feel integrated with expanded row content.
  - Lines are black, sharp, slanted, no gradient, no rounding.
  - Final visual checks:
    - `output/manual-check/turn-lines-expanded-integrated-v3.png`
    - (collapsed reference) `output/manual-check/turn-lines-black-sharp-collapsed-v1.png`

- Request: remove marker lines in expanded sidebar.
  - Disabled active marker pseudo-elements for expanded state:
    - `.scoreboard.scoreboard--expanded .scoreboard-player.is-active .scoreboard-player-detail::before/::after { content: none; }`
  - Kept collapsed-state black slanted lines unchanged.
  - Verification:
    - collapsed: row `::before/::after` still present,
    - expanded: row and detail `::before/::after` all `none`.
  - Screenshot: `output/manual-check/turn-lines-expanded-removed-v1.png`.

- Request: reduce shadows on mini-cards in expanded sidebar and make them more realistic 2D.
  - Updated mini-card base shadow from chunky comic offset to subtle flat shadow.
  - Added expanded-state override for mini-cards:
    - `border-width: 1px`,
    - `box-shadow: 0 1px 0 inset + 0 1px 2px`.
  - Verification:
    - computed style in expanded panel:
      - `boxShadow = rgba(255,250,240,0.38) 0 1px 0 inset, rgba(21,17,28,0.18) 0 1px 2px`
      - `borderWidth = 1px`
    - screenshot: `output/manual-check/scoreboard-mini-cards-shadow-2d-v2.png`.

- Request: make player outline in expanded sidebar more pleasant and less cramped.
  - Updated expanded player rows with more breathing room:
    - `margin: 2px 0 4px`, `padding: 4px 4px 5px`.
  - Reworked row outline to softer 2D style:
    - subtle border (`rgba(21,17,28,0.08)`),
    - light paper background tint,
    - minimal inset highlight.
  - Active row outline now cleaner and less harsh:
    - stronger but soft border (`rgba(21,17,28,0.22)`),
    - light background lift,
    - small realistic 2D shadow.
  - Verification screenshot: `output/manual-check/scoreboard-row-outline-expanded-v1.png`.

- Follow-up: expanded sidebar row spacing became too large.
  - Restored expanded row spacing to previous values:
    - `margin: 0`,
    - `padding: 0`.
  - Kept row outline style updates intact.
  - Verification:
    - computed `margin: 0px`, `padding: 0px`.
    - screenshot: `output/manual-check/scoreboard-row-spacing-restored-v1.png`.

- Request: in expanded panel use top/bottom divider lines instead of rounded active highlight.
  - Reworked active-row style in expanded sidebar:
    - removed rounded highlight (`border-radius: 0` on active row),
    - removed active border,
    - added active `::before` and `::after` as horizontal divider lines at top and bottom.
  - Verification:
    - active row computed: `rowRadius=0px`, `rowBorderColor=transparent`,
    - pseudo-lines present with `height=2px` and positions `top=0`, `bottom=0`.
  - Screenshot: `output/manual-check/scoreboard-active-lines-top-bottom-v1.png`.

- Request: remove outlines around players in expanded panel, keep active lines.
  - Cleared expanded row chrome:
    - `border: 0`, `background: transparent`, `box-shadow: none`, `border-radius: 0`.
  - Kept active row top/bottom divider lines intact.
  - Verification:
    - normal row computed: `rowBorder=0px none`, `rowBg=transparent`, `rowShadow=none`.
    - active line pseudo-elements still present.
  - Screenshot: `output/manual-check/scoreboard-expanded-no-row-outline-v1.png`.

- Request: remove pulsing red lines appearing when players receive cards.
  - Disabled turn-pulse trigger in `app.js` by removing `pulseClass(activeRow, 'fx-turn-in', ...)` call from `applySnapshotAnimations`.
  - Result: class `.fx-turn-in` is no longer applied during/after draw.
  - Verification (expanded panel, draw sequence):
    - `fxTurnInCount` stayed `0` at 120ms / 340ms / 640ms after draw.
  - Screenshot: `output/manual-check/no-red-pulse-after-draw-v1.png`.

- 2026-03-01 global font update (`DK Crayon Crumble`):
  - Replaced Google Fonts import in `styles.css` with local `@font-face` declaration:
    - `font-family: "DK Crayon Crumble"; src: local("DK Crayon Crumble");`
  - Switched both typography variables to the same family for full UI consistency:
    - `--font-sans` and `--font-body` now use `"DK Crayon Crumble"` (with cursive/sans fallbacks).
  - Note: no local font files (`.ttf/.otf/.woff`) for this family were found in the repo; rendering depends on system-installed font availability.

- Verification (Playwright + screenshot review):
  - `output/manual-check/font-dk-crayon-v3/shot-0.png` (game screen after `#btnStart`) shows updated typography on UI controls.
  - Additional start-screen captures:
    - `output/manual-check/font-dk-crayon-v1/shot-0.png`
    - `output/manual-check/font-dk-crayon-v2/shot-0.png`

- 2026-03-01 expanded sidebar nickname/points layout refresh (comic-aligned):
  - Rebuilt player header markup in `app.js` for expanded rows:
    - nickname now rendered in `.scoreboard-player-name`
    - points now rendered as a separate badge `.scoreboard-player-points` with `PTS` label and `.score-value`
  - Updated `styles.css` header layout to enforce clean positioning:
    - `total-score-row` is now a two-column flex row (name left, score badge right)
    - nickname truncates correctly and keeps uppercase comic rhythm
    - score badge gets compact slanted paper-tag styling for comic look
  - Verification artifacts:
    - game render check via web-game client: `output/manual-check/sidebar-name-score-layout-v1/shot-0.png`
    - expanded panel visual check: `output/manual-check/sidebar-name-score-layout-expanded-v1.png`
- Cache bust:
  - bumped asset query version in `index.html` to `styles.css?v=10` and `app.js?v=10`.

- 2026-03-01 sidebar mechanics FX expansion + deck-to-player fly animation:
  - `app.js`:
    - Enabled fly-card by default (`disableFlyCard: false`, still respects reduced-motion fallback in `init`).
    - Added `queueDrawUiFx(game, player, result)` helper so every draw event consistently pushes sidebar UI FX (`draw` + `bust` when needed).
    - Extended target-draw flows (`drawCardsForTarget`) to queue UI FX too (FlipThree chains and Freeze-driven stop now animate in sidebar as well).
    - Added stop FX queue when Freeze is applied to a selected target (`applyFreezeToTarget`).
    - Upgraded `processQueuedFx` to drive sidebar-specific comic/sketch animations on mechanics:
      - draw: panel pulse + row hit + deck tick + `spawnFlyingCard` to actual player row/card area,
      - bust: panel bust + row bust,
      - stop: panel bank + row stop mark,
      - round start/end: panel round pulses,
      - turn shift: panel + active row accent via snapshot delta.
    - Added panel toggle pulse on expand/collapse click (`fx-panel-toggle`).
    - Improved `spawnFlyingCard` trajectory variables (`--fly-arc`, `--fly-rot-start`, `--fly-rot-mid`) for an arced comic flight.

  - `styles.css`:
    - Added new sidebar FX classes and animations:
      - panel-level: `fx-panel-toggle`, `fx-sidebar-pulse`, `fx-sidebar-turn-shift`, `fx-sidebar-bank`, `fx-sidebar-bust`, `fx-sidebar-round-start`, `fx-sidebar-round-end`.
      - row-level: `fx-turn-shift`, `fx-draw-hit`, `fx-stop-mark`, plus points badge bust reaction.
      - marker-style black sketch strokes on header row for draw/stop (`.total-score-row::before/::after`).
    - Enhanced `fx-fly-card` visual style and trajectory:
      - less bulky 2D shadow, comic ink trails (`::before/::after`), longer and clearer arced flight keyframes.

  - Cache bust:
    - bumped asset query version in `index.html` to `styles.css?v=11` and `app.js?v=11`.

- Verification:
  - Skill loop run (no errors): `output/manual-check/sidebar-comic-fx-v1/shot-0.png`.
  - Focused visual flow checks:
    - expanded panel baseline: `output/manual-check/sidebar-fx-expanded-before-v1.png`
    - mid-flight card from deck to player: `output/manual-check/sidebar-fx-flycard-mid-v1.png`
    - post-draw/sidebar reaction: `output/manual-check/sidebar-fx-after-draw-v1.png`
    - subsequent bot turn/sidebar reaction: `output/manual-check/sidebar-fx-bot-turn-v1.png`
- Follow-up tweak (same request):
  - `getTargetForFly` now routes human draw flight into sidebar row when sidebar is expanded, preserving player-area target only in collapsed mode.
  - Re-ran skill verification after this tweak:
    - `output/manual-check/sidebar-comic-fx-v2/shot-0.png`.
  - Additional focused captures after target-routing update:
    - `output/manual-check/sidebar-fx-flycard-mid-v2.png`
    - `output/manual-check/sidebar-fx-after-draw-v2.png`
- Follow-up hotfix:
  - Removed ink-trail pseudo-lines from `.fx-fly-card` (`::before`/`::after`) per user feedback.
  - Bumped cache version to `v=12` in `index.html`.
  - Verification: `output/manual-check/sidebar-fx-flycard-mid-v3-no-lines.png`.
- Follow-up refinement (user request: jagged comic card motion):
  - Reworked `.fx-fly-card` timing to feel intentionally choppy comic-style instead of laggy:
    - `animation: fly-card-comic 0.42s linear forwards`
    - added `will-change: transform, opacity` and `backface-visibility: hidden` for cleaner rendering.
  - Rebuilt `@keyframes fly-card-comic` with micro hold-frames (duplicated pose segments) to create controlled “rvanaya” movement beats.
  - Cache bust: `styles.css?v=13` in `index.html`.

- Verification:
  - Focused captures:
    - `output/manual-check/sidebar-fx-flycard-mid-v4-jagged.png`
    - `output/manual-check/sidebar-fx-after-draw-v4-jagged.png`
  - Skill loop check:
    - `output/manual-check/sidebar-comic-fx-v3/shot-0.png`

- 2026-03-01 retro comics (70-80s) motion/style refinement for sidebar + fly-card:
  - Reworked sidebar visual language to paper-cut aesthetic:
    - panel texture layers + subtle halftone print dots,
    - torn paper side strip via `clip-path` on `.scoreboard::before`,
    - print-like overlay grain on `.scoreboard::after`.
  - Expanded row details now look like paper strips/cards:
    - light paper background, clipped corners, subtle border in expanded mode.
  - Rebuilt sidebar mechanic animations to be less “lag-like” and more stylized retro motion:
    - updated timing curves and amplitude for panel/row turn, draw, bank, bust, round start/end.
  - Replaced marker-stroke bursts with paper cut snippets during interactions:
    - new animations: `sidebar-paper-cut-draw`, `sidebar-paper-cut-draw-mini`, `sidebar-paper-cut-stop`.
  - Reworked fly-card to paper-cut postcard style:
    - irregular cutout shape (`clip-path`), folded corner accent (`::before`), softer print-like shading.
  - Updated fly-card trajectory to comic stop-motion feel without stutter:
    - fewer deliberate hold phases + analog easing (`0.44s cubic-bezier(.18,.86,.28,1)`).
  - Cache bust update:
    - `styles.css?v=14` in `index.html`.

- Verification:
  - expanded paper-style baseline: `output/manual-check/sidebar-paper-style-before-v1.png`
  - card flight mid-frame (paper-cut look): `output/manual-check/sidebar-paper-fly-mid-v1.png`
  - post-draw state: `output/manual-check/sidebar-paper-after-v1.png`
  - skill loop check (no errors): `output/manual-check/sidebar-paper-skill-v1/shot-0.png`

- 2026-03-01 feature request: hover preview for mini-cards in expanded sidebar.
  - Added floating preview overlay that appears when hovering mini-cards in expanded scoreboard:
    - new helpers in `app.js`: `ensureSidebarCardPreview`, `showSidebarCardPreview`, `moveSidebarCardPreview`, `hideSidebarCardPreview`, `bindSidebarCardPreview`.
    - preview follows cursor and prefers appearing to the right of pointer with viewport-edge clamping.
    - preview clones the hovered mini-card visual classes/content so it matches current card artwork.
  - Added lifecycle safeguards:
    - auto-hide on panel collapse, scoreboard leave/scroll/click, window resize/blur, and tab hidden.
    - disabled for coarse/touch pointers.
  - Added dedicated preview styles in `styles.css` (light comic-paper card look, fast fade/scale-in).
  - Cache bust update:
    - `styles.css?v=15`, `app.js?v=15` in `index.html`.

- Verification:
  - Syntax: `node --check app.js` (pass).
  - Interactive Playwright run (Start -> Draw -> expand sidebar -> hover mini-card):
    - result payload: `{\"hasPreview\":true,\"visible\":true,...}`
    - screenshot: `output/manual-check/sidebar-hover-preview-v3.png`.

- 2026-03-01 collapsed-sidebar round gain label (`+N`) request.
  - Added per-player round gain marker in sidebar row render (`app.js`):
    - computes current round score (`computeRoundScore`) and shows `+N` only when `N > 0`,
    - for busted state, round gain is forced to `0` (label hidden).
  - Added new collapsed-only UI element styles in `styles.css`:
    - `.scoreboard-round-gain` positioned at row top-right,
    - pencil-like handwritten treatment (tilt, graphite-like shadow, rough underline stroke),
    - hidden automatically in expanded panel.
  - Cache bust update:
    - `styles.css?v=16`, `app.js?v=16` in `index.html`.

- Verification:
  - Syntax: `node --check app.js` (pass).
  - Interactive Playwright run (Start -> Draw; sidebar collapsed):
    - payload: `{\"expanded\":false,\"gainCount\":1,\"gains\":[\"+10\"],...}`
    - screenshot: `output/manual-check/sidebar-collapsed-round-gain-v1.png`.

- 2026-03-01 readability refinement for collapsed `+N` round-gain label.
  - Increased visual emphasis of `.scoreboard-round-gain`:
    - larger/denser text, stronger graphite-like shadows,
    - paper-note background with darker border/inset contour,
    - thicker rough underline and slightly stronger rotation for hand-drawn feel.
  - Cache bust update:
    - `styles.css?v=17`, `app.js?v=17` in `index.html`.

- Verification:
  - Playwright style-check with forced `+10` marker in collapsed sidebar:
    - computed style confirms larger text and high-contrast note background.
    - screenshot: `output/manual-check/sidebar-collapsed-round-gain-v2-stylecheck.png`.

- 2026-03-01 rollback per user request:
  - Reverted `.scoreboard-round-gain` to previous lightweight look (no background note block).
  - Kept only one tweak: slightly bolder digits (`font-weight: 900`).
  - Cache bust update:
    - `styles.css?v=18`, `app.js?v=18` in `index.html`.

- Verification:
  - Playwright style-check (forced `+10`) confirms reverted transparent style + bold weight.
  - screenshot: `output/manual-check/sidebar-collapsed-round-gain-v3-revert-bold.png`.

- 2026-03-01 deck-focused animation/visual pass (new request: "колода, ее анимация и визуал").
  - Added dedicated deck wrapper identity in markup:
    - `index.html`: `<div class="deck-wrap" id="deckWrap">...`.
  - Upgraded deck visuals in `styles.css`:
    - new ambient wrapper aura + radial comic burst layers on `#game .deck-wrap::before/::after`,
    - restored top-card overlay detail (`#game .deck-stack::before`) with subtle halftone/shine texture,
    - added moving glare layer (`#game .deck-stack::after`) and idle glint state when draw is available (`.deck-stack.is-ready`).
  - Added explicit deck FX states:
    - draw: `#deckStack.fx-deck-draw`, `#deckWrap.fx-deck-draw`,
    - round shuffle: `#deckWrap.fx-deck-shuffle` synced with existing `#deckStack.fx-deck-shuffle`,
    - empty deck: `#deckWrap.fx-deck-empty` synced with `#deckStack.fx-deck-empty`.
  - Added/updated keyframes for deck-only motion language:
    - `deck-draw-pop-comic`,
    - `deck-wrap-aura-pop`, `deck-wrap-lines-pop`,
    - `deck-wrap-aura-shuffle`, `deck-wrap-lines-shuffle`,
    - `deck-wrap-aura-empty`, `deck-wrap-lines-empty`,
    - `deck-shine-idle`, `deck-shine-draw`, `deck-shine-shuffle`, `deck-shine-empty`.
  - Wired FX in `app.js` via existing `pulseClass` pipeline (no gameplay logic changes):
    - on `draw`: now pulses deck count + deck card + wrapper burst,
    - on `round-end`: pulses shuffle on deck card + wrapper burst,
    - on `deck-empty`: pulses empty shake on deck card + wrapper.
    - `render()` now toggles `deckStack.is-ready` only when human can draw.
  - Cache bust update:
    - `styles.css?v=19`, `app.js?v=19` in `index.html`.

- Verification:
  - Syntax check: `node --check app.js` (pass).
  - Skill Playwright client run (requires escalation in this environment):
    - `output/manual-check/deck-visual-anim-v1/shot-0.png`
    - `output/manual-check/deck-visual-anim-v2/shot-0.png`
  - Visual check confirms new deck look (texture + glare layer + stronger deck presence) is rendered.

- TODO / next-agent:
  - The current skill Playwright client supports only one `--click-selector`, so this run validates deck visuals after game start but does not reliably force a `Draw` click in the same scenario for frame-perfect capture of `fx-deck-draw`.
  - If strict animation proof is required, run an additional custom Playwright script that clicks `#btnStart` and then `#deckStack`, capturing mid-animation frames.

- 2026-03-01 deck horizontal centering request.
  - Centered deck horizontally relative to the whole game field (not the second grid column):
    - `#game .deck-panel` now spans full grid width (`grid-column: 1 / -1`), uses `justify-self: center`, and no horizontal translate offset.
    - removed deck base/shift positioning variables from `.game-layout` and neutralized expanded-state deck translates.
  - Cache bust update:
    - `styles.css?v=20` in `index.html`.

- Verification:
  - Playwright visual check (start -> game):
    - `output/manual-check/deck-centered-v1/shot-0.png`
  - Result: deck card is centered on X axis of the game panel while sidebar remains on the left.

- 2026-03-02 micro-adjustment: lowered deck position slightly.
  - `#game .deck-panel` now has `margin-top: 10px` to move the centered deck down a little.
  - Cache bust update: `styles.css?v=21` in `index.html`.

- Verification:
  - Playwright visual check: `output/manual-check/deck-lower-v1/shot-0.png`.

- 2026-03-02 target picker behavior with expanded sidebar (skill cards).
  - Updated target-picker layout so buttons move right with sidebar expansion and stay inside game field:
    - introduced `--target-picker-shift` on `.game-layout` and `--target-picker-offset` on `.deck-panel`.
    - when sidebar is expanded (`.game-layout--expanded` or `.scoreboard--expanded + .deck-panel`), target-picker offset follows sidebar width delta.
    - `#game .target-picker-wrap` migrated from rigid grid to wrapping flex layout with bounded width:
      - `flex-wrap: wrap`,
      - `max-width: calc(100% - offset)`,
      - animated `transform: translateX(offset * 0.5)` and `max-width` using panel easing.
  - Fixed inherited full-width button issue for picker buttons (from global `button { width:100% }`):
    - `#game .target-picker-btn { width: auto; flex: 0 1 auto; white-space: nowrap; }`.
  - Cache bust update:
    - `styles.css?v=23` in `index.html`.

- Verification:
  - Automated Playwright scenario with forced expanded sidebar + 10 target buttons:
    - screenshot: `output/manual-check/target-picker-shift-wrap-v2.png`
    - metrics: `output/manual-check/target-picker-shift-wrap-v2.json`
      - `overflowCount = 0` (no button leaves game field)
      - `rowCount = 5` (buttons wrap to next rows when needed).

- 2026-03-02 refinement: keep skill target buttons at a small distance from sidebar in both collapsed/expanded states.
  - Reworked picker anchoring logic to reserve explicit left space equal to sidebar width + gap:
    - `.game-layout` now defines `--target-picker-gap`.
    - `.deck-panel` now tracks active sidebar width via `--target-picker-sidebar-w` (collapsed/expanded).
    - `#game .target-picker-wrap` now uses left padding `calc(sidebar-width + gap)` and `justify-content: flex-start`.
  - This guarantees target buttons never overlap sidebar and stay to its right, while still wrapping to next rows.
  - Cache bust update:
    - `styles.css?v=24` in `index.html`.

- Verification:
  - Automated Playwright gap check for both states:
    - `output/manual-check/target-picker-gap-check-v1.json`
    - collapsed: `horizontalGap = 28`, `overflowCount = 0`
    - expanded: `horizontalGap = 28`, `overflowCount = 0`
  - Screenshots:
    - `output/manual-check/target-picker-gap-collapsed-v1.png`
    - `output/manual-check/target-picker-gap-expanded-v1.png`

- 2026-03-02 request: increase chance of ability (action) cards for human player.
  - Added configurable boost constant in game rules:
    - `HUMAN_ACTION_DRAW_BOOST_CHANCE = 0.38`.
  - Implemented human-only action bias in draw pipeline (`drawCardWithHumanActionBoost`):
    - bots still draw top card as before,
    - human keeps top card if it is already action,
    - otherwise, with boost chance, draw picks a random action card from remaining deck and removes it.
  - Wired `drawOne()` to use the new helper.
  - Cache bust update:
    - `app.js?v=20` in `index.html`.

- Verification:
  - Syntax check: `node --check app.js` (pass).
  - Skill Playwright sanity run:
    - `output/manual-check/action-boost-sanity-v1/shot-0.png`.
  - Interactive draw-check (auto clicks + log extraction):
    - `output/manual-check/action-boost-human-check-v1.json`
    - `output/manual-check/action-boost-human-check-v1.png`
    - observed human action draw in run: `Player 1 drew Freeze — must stop.`

- 2026-03-02 fix: sidebar expand/collapse reliability when skill target picker is visible.
  - Root cause: wide `.deck-panel` overlay area could intercept clicks over sidebar region.
  - Fix in CSS interaction layers:
    - `#game .deck-panel { pointer-events: none; }`
    - `#game .deck-wrap { pointer-events: none; }`
    - `#game .deck-stack { pointer-events: auto; }` (keeps deck click working)
    - target picker remains non-blocking in empty areas with clickable buttons only.
  - Cache bust update:
    - `styles.css?v=26` in `index.html`.

- Verification:
  - Real-click Playwright test with visible skill buttons:
    - `output/manual-check/sidebar-toggle-with-skill-picker-v2-realclick.json`
      - hit target before click: sidebar avatar element (not deck overlay)
      - `toggledOpen = true`, `toggledClosed = true`
    - screenshot: `output/manual-check/sidebar-toggle-with-skill-picker-v2-realclick.png`

- 2026-03-02 request: deck should move right from center when sidebar expands (in sync with target buttons).
  - Enabled dynamic deck shift tied to sidebar width delta:
    - `.deck-panel` now computes `--deck-shift-x` from current sidebar width and applies `transform: translateX(var(--deck-shift-x))`.
    - transition for deck shift uses the same comic panel easing.
  - Kept target picker synchronized with deck shift:
    - fixed picker left padding to collapsed sidebar baseline, so when deck shifts right on expand, picker shifts by the same amount (no double-shift).
  - Cache bust update:
    - `styles.css?v=28` in `index.html`.

- Verification:
  - Measured collapsed vs expanded deck and target-button positions:
    - `output/manual-check/deck-shift-with-sidebar-v2.json`
      - `deckShiftX = 78`
      - `buttonShiftX = 78`
      - gap to sidebar preserved in both states: `28px`.
  - Screenshots:
    - `output/manual-check/deck-shift-with-sidebar-collapsed-v2.png`
    - `output/manual-check/deck-shift-with-sidebar-expanded-v2.png`

- 2026-03-02 follow-up: restore wrapping of target buttons in expanded sidebar mode and keep inside game field.
  - Fixed overflow root cause for expanded mode:
    - `#game .target-picker-wrap` now uses `align-self: stretch` so it aligns to deck-panel width baseline instead of being centered as a narrower block.
    - kept dynamic width cap `max-width: calc(100% - deck-shift)` and wrapping enabled.
  - Cache bust update:
    - `styles.css?v=30` in `index.html`.

- Verification:
  - Playwright overflow/wrap check (12 target buttons):
    - `output/manual-check/target-picker-wrap-restored-v2.json`
      - collapsed: `overflowCount = 0`, `rowCount = 5`
      - expanded: `overflowCount = 0`, `rowCount = 6`
      - sidebar gap remains stable: `28px` in both states.
  - Screenshots:
    - `output/manual-check/target-picker-wrap-restored-collapsed-v2.png`
    - `output/manual-check/target-picker-wrap-restored-expanded-v2.png`

- 2026-03-02 deck placement geometry update per user requirement.
  - New behavior:
    - collapsed sidebar: deck remains centered horizontally in the game field,
    - expanded sidebar: deck center is exactly the midpoint between sidebar right edge and game-field right edge.
  - Implemented by updating deck shift formula:
    - base: `--deck-shift-x: 0` (collapsed)
    - expanded: `--deck-shift-x: ((expanded-sidebar-width - 18px) / 2)`
  - Adjusted target-picker left padding formula to keep non-overlap + wrapping while following the new deck shift.
  - Cache bust update:
    - `styles.css?v=31` in `index.html`.

- Verification:
  - Geometry + overflow check:
    - `output/manual-check/deck-center-between-sidebar-and-right-v1.json`
      - collapsed: `deckVsFieldCenterDelta = 0`
      - expanded: `deckVsTargetDelta = 0`
      - button overflow remains `0` in both states; wrapping active (`rowCount` grows in expanded state).
  - Screenshots:
    - `output/manual-check/deck-center-between-collapsed-v1.png`
    - `output/manual-check/deck-center-between-expanded-v1.png`

- 2026-03-07 code organization:
  - Split monolithic `app.js` into `src/app-core.js`, `src/app-ui.js`, `src/app-main.js` (loaded in this order from `index.html`).
  - Removed unused legacy `src/*.js` stubs and the old `app.js` to avoid duplication; logic preserved (only file layout changed).

- 2026-03-07 poster-comic foundation + core layout pass (user asked for actual applied changes):
  - Removed the global flat reset block at the end of `styles.css` that was forcing neutral UI and suppressing many stylistic/FX cues.
  - Added a new active default override section: `Default poster-comic override (active)`.
  - Kept mechanics and block placement unchanged; only visual layer updated (palette tokens, typography, panel treatments, deck/card/button styling, toast/overlay visuals).
  - Updated cache-bust for stylesheet in `index.html` from `styles.css?v=31` to `styles.css?v=32`.

- Validation (develop-web-game skill loop):
  - Playwright capture (start screen): `output/manual-check/poster-foundation-start-v1/shot-0.png`
  - Playwright capture (game screen after start): `output/manual-check/poster-foundation-v1/shot-0.png`
  - No console error artifact was emitted by the client run (`errors-0.json` not produced in these runs).

- Notes for next iteration:
  - This pass is Stage 1+2 only (foundation + core layout visuals).
  - Next safe step: dedicated cards pass (face/back/state polish) without touching gameplay JS.

- 2026-03-07 full visual-system rebuild pass (new directive: treat old UI as scaffolding and build a new visual layer):
  - Added a separate active theme file: `theme-comic-rebuild.css`.
  - Wired the new theme after legacy CSS in `index.html` and enabled it via `body.theme-comic-rebuild`.
  - Rebuilt the visual system in the new file instead of continuing to edit legacy selectors:
    - new tokens,
    - new poster-style background,
    - rebuilt panel language,
    - rebuilt scoreboard surfaces,
    - rebuilt deck back as CSS object (no old asset as primary visual),
    - rebuilt buttons,
    - rebuilt empty hand state,
    - rebuilt card styling rules and motion classes.
  - Left game logic and DOM-driven mechanics unchanged.

- Validation:
  - start screen: `output/manual-check/poster-foundation-start-v1/shot-0.png`
  - gameplay shell after start: `output/manual-check/poster-foundation-v1/shot-0.png`
  - auxiliary click attempt: `output/manual-check/poster-foundation-draw-v2/shot-0.png`

- Test-loop limitation discovered:
  - The local Playwright helper supports one DOM `--click-selector`, but its scripted mouse actions are offset from a canvas bounding box.
  - This project is DOM-based rather than canvas-based, so the helper could validate start -> game transition, but not reliably press `Draw` as a second DOM interaction in the same run.
  - Result: the new in-hand card look is implemented in CSS but not visually confirmed in a live draw screenshot in this pass.

- 2026-03-07 hard reset after rejected rebuild:
  - Removed the rejected `theme-comic-rebuild.css`.
  - Switched active visual layer to `theme-afterhours-poster.css` via `body.theme-afterhours-poster`.
  - New direction: after-hours editorial poster / adult-coded neo-comic styling.
  - Kept HTML intact and did not override layout geometry:
    - no `grid-template` overrides,
    - no width/height overrides for main gameplay regions,
    - no relocation of scoreboard / deck / hand / actions blocks.
  - Rebuilt visual language only:
    - new palette logic,
    - new paper/surface treatment,
    - new deck-back identity,
    - new card framing language,
    - new button language,
    - new scoreboard treatment,
    - new toast/overlay styling,
    - restrained sharp motion overrides.

- Validation:
  - start screen: `output/manual-check/afterhours-start-v1/shot-0.png`
  - gameplay shell: `output/manual-check/afterhours-game-v1/shot-0.png`
- 2026-03-07 sidebar row alignment fix:
  - In collapsed scoreboard state, aligned avatar rows to the same vertical row rhythm as expanded nickname rows.
  - CSS change only in `theme-afterhours-poster.css`.
  - Verification: `output/manual-check/sidebar-parallel-v1/collapsed.png` and `output/manual-check/sidebar-parallel-v1/expanded.png`.

- Sidebar compactness fix after user feedback ("last account does not fit"):
  - Compressed only the internal vertical rhythm of the sidebar in `theme-afterhours-poster.css`.
  - Reduced scoreboard inner gap/padding, player row min-height, avatar size, detail spacing, point chip padding, and mini-card height.
  - Kept scoreboard footprint and placement unchanged.
  - Verified with Playwright geometry:
    - collapsed: `scrollHeight=376`, `clientHeight=376`, `fits=true`
    - expanded: `scrollHeight=376`, `clientHeight=376`, `fits=true`
  - Visual checks:
    - `output/manual-check/sidebar-compact-v2/collapsed.png`
    - `output/manual-check/sidebar-compact-v2/expanded.png`
    - metrics: `output/manual-check/sidebar-compact-v2/metrics.json`
- Reverted the last sidebar compactness pass at user request.
  - Restored the previous afterhours sidebar spacing, row height, avatar size, and mini-card rhythm.
  - Preserved the earlier avatar/nickname parallel alignment fix.
  - Quick visual re-check: `output/manual-check/sidebar-revert-v1/shot-0.png`
- Sidebar spacing tweak after user feedback:
  - Increased the perceived gap between collapsed sidebar avatars by slightly reducing closed-state avatar size to `38px`.
  - Did not change row layout, panel footprint, or game logic.
  - Visual check: `output/manual-check/sidebar-revert-v1/shot-0.png`
- Sidebar spacing follow-up:
  - Increased the gap between collapsed sidebar avatars one more step by reducing closed-state avatar size from `38px` to `36px`.
  - Visual check refreshed: `output/manual-check/sidebar-revert-v1/shot-0.png`
- Sidebar avatar size tweak after user feedback:
  - Increased collapsed sidebar avatars by 20% (`36px` -> `43.2px`).
  - Verified visually: `output/manual-check/sidebar-revert-v1/shot-0.png`
- Sidebar gap tweak after user feedback:
  - Increased closed-sidebar vertical gap by one-third via a collapsed-only scoreboard gap override (`3px` -> `4px`).
  - Kept avatar size, panel footprint, expanded state, and game logic unchanged.
  - Visual check: `output/manual-check/sidebar-gap-v1/shot-0.png`
- Sidebar avatar vertical offset tweak:
  - Lowered collapsed-sidebar avatars slightly with `margin-top: 2px`.
  - Kept panel footprint, gap, and expanded state untouched.
  - Visual check refreshed: `output/manual-check/sidebar-gap-v1/shot-0.png`
- Sidebar avatar offset follow-up:
  - Lowered collapsed-sidebar avatars one more micro-step by changing `margin-top` from `2px` to `3px`.
  - Visual check refreshed: `output/manual-check/sidebar-gap-v1/shot-0.png`
- Sidebar parallelism fix for expanded state:
  - Increased expanded-sidebar row spacing via a higher-specificity override on `#game .scoreboard.scoreboard--expanded` (`gap: 5px`).
  - This aligns the expanded row rhythm with the closed-sidebar avatar rhythm.
  - Verified geometrically:
    - collapsed avatar step: `53.1873px`
    - expanded row/name step: `53.1248px`
    - per-row top delta stays within about `0.6px`
  - Artifacts:
    - `output/manual-check/sidebar-expanded-parallel-v1/expanded.png`
    - `output/manual-check/sidebar-expanded-parallel-v1/metrics.json`
- Full art-direction reset: switched the active game theme from `theme-afterhours-poster` to a new `theme-underground-comic` visual layer.
  - New active file: `theme-underground-comic.css`
  - `index.html` now links `theme-underground-comic.css?v=1` and uses `body.theme-underground-comic`
- Visual direction implemented:
  - adult indie comic / underground comic palette (`#FAF7F2`, black ink, pink/purple/orange/red/teal)
  - lighter, emptier background with sparse dots and minimal graphic accents
  - Bangers/Comic Neue/Bebas hierarchy via existing font imports from `styles.css`
  - asymmetrical comic-panel buttons with hard black outline and step-like interactions
  - simplified panels, scoreboard, deck, cards, bursts, toasts, and overlay in one visual language
  - retained existing DOM/layout geometry and game logic
- Sidebar tweaks carried into the new theme:
  - collapsed avatar size/offset and gap retained
  - expanded row spacing adjusted to stay parallel with the closed-sidebar avatar rhythm
- Verification artifacts:
  - start screen: `output/manual-check/underground-start-v1/shot-0.png`
  - game screen: `output/manual-check/underground-game-v1/shot-0.png`
  - draw state: `output/manual-check/underground-draw-v1/game-draw.png`
  - draw state + expanded sidebar: `output/manual-check/underground-draw-v1/game-draw-expanded.png`
  - expanded sidebar spacing metrics: `output/manual-check/sidebar-expanded-parallel-v1/metrics.json`
- Follow-up polish on the new underground-comic theme:
  - raised the deck title layer above the decorative overlay and reduced overlay opacity for better `STREAK` readability on the card back.
  - refreshed game screenshot: `output/manual-check/underground-game-v1/shot-0.png`
- Global backdrop-only pass for the underground-comic theme:
  - Added `assets/background-main.svg`, `assets/background-halftone.svg`, and `assets/background-lines.svg`.
  - Updated only the `body.theme-underground-comic` background block in `theme-underground-comic.css` to use the new layered SVG scene backdrop.
  - Disabled old body pseudo-background decorations (`body.theme-underground-comic::before` and `::after`).
  - Added a very subtle body-level background breathe animation (`underground-background-breathe`).
  - No HTML, JS, layout, geometry, or component sizing changes.
  - Verification:
    - `output/manual-check/background-backdrop-start-v1/shot-0.png`
    - `output/manual-check/background-backdrop-game-v1/shot-0.png`
- Background art direction correction:
  - Replaced the dark club-like backdrop with a light editorial-comic scene backdrop.
  - Rewrote `assets/background-main.svg`, `assets/background-halftone.svg`, and `assets/background-lines.svg` for a cream / pastel / airy composition.
  - Updated only the `body.theme-underground-comic` background block and kept body pseudo-elements disabled.
  - No layout, geometry, component sizing, HTML, or JS changes.
  - Final verification:
    - `output/manual-check/background-backdrop-start-v2/shot-0.png`
    - `output/manual-check/background-backdrop-game-v2/shot-0.png`
- Background perimeter-frame correction:
  - Rebuilt `assets/background-main.svg` and `assets/background-lines.svg` to create a stronger editorial-comic border composition with repeated edge motifs and a quiet center.
  - Kept the task limited to backdrop assets and the `body.theme-underground-comic` background block.
  - Old body pseudo-elements remain disabled.
  - No layout, geometry, component styling, HTML, or JS changes.
  - Verification:
    - `output/manual-check/background-backdrop-start-v3/shot-0.png`
    - `output/manual-check/background-backdrop-game-v3/shot-0.png`
- Background illustration-frame correction after rejection of the clean vector look:
  - Replaced the active backdrop stack in `body.theme-underground-comic` with new art assets:
    `assets/background-frame-main.svg`, `assets/background-frame-halftone.svg`, `assets/background-frame-grain.svg`.
  - Shifted the background from minimal SVG decoration toward a printed editorial-comic frame:
    rough brush edges, embedded halftone inside the color fields, stronger black motion lines, warmer paper base, and more visible print grain.
  - Kept the center visually open for gameplay and did not change layout, geometry, buttons, cards, scoreboard, HTML, or game logic.
  - Disabled the old background breathe animation to keep the backdrop feeling like static printed artwork instead of moving UI decor.
  - Validation:
    - `xmllint --noout assets/background-frame-main.svg assets/background-frame-halftone.svg assets/background-frame-grain.svg`
    - attempted `$WEB_GAME_CLIENT` run, but the current page still times out waiting for `DOMContentLoaded`
    - fallback visual captures via local Chromium CDP:
      - `output/manual-check/background-frame-manual-v2/start.png`
      - `output/manual-check/background-frame-manual-v2/game.png`
- Calm background pass based on the new art-direction note:
  - Added a single-source calm background asset flow:
    - source: `assets/background/streak-bg-calm-source.svg`
    - output: `assets/background/streak-bg-calm.png` (2048x2048)
  - Updated `body.theme-underground-comic` to use only `url("./assets/background/streak-bg-calm.png")`.
  - The old layered `background-frame-*` stack is no longer active in CSS.
  - Composition changed toward a cleaner board-game backdrop:
    empty center, corner-only accents, light paper field, halftone, short marker curves, small lightning/star accents.
  - First raster pass dropped the large color fields under QuickLook filter rendering, so the source SVG was corrected to use flat brush-shape fills instead of filtered main blobs and the PNG was rebuilt.
  - Validation:
    - `file assets/background/streak-bg-calm.png` -> `PNG image data, 2048 x 2048`
    - local server served `GET /assets/background/streak-bg-calm.png 200`
- Calm background rework after the user supplied a tighter visual reference:
  - Rebuilt `assets/background/streak-bg-calm-source.svg` to match the approved direction more closely:
    large pink and violet corner clouds, stronger brush sweeps with white cut lines, cyan and gold corner bursts, more hearts, stars, and confetti, and a softer poster-paper field in the center.
  - Kept the center mostly empty and preserved the single-file CSS hookup to `assets/background/streak-bg-calm.png`.
  - Re-rasterized `assets/background/streak-bg-calm.png` from the updated source.
  - Verification:
    - asset preview checked directly from `assets/background/streak-bg-calm.png`
    - standard `$WEB_GAME_CLIENT` succeeded after this pass
    - start screen: `output/manual-check/background-calm-start-v2/shot-0.png`
    - game screen: `output/manual-check/background-calm-client-v2/shot-0.png`
- Calm background sharpness correction after user feedback about overly rounded shapes:
  - Rebuilt `assets/background/streak-bg-calm-source.svg` again with sharper, more poster-like forms:
    pointed pink and violet sweeps, wedge-shaped white cut slashes, harder black accent shards, more angular cyan/gold corner strokes, and less rounded silhouette language overall.
  - Kept the same single-file hookup in `theme-underground-comic.css`:
    `background-image: url("./assets/background/streak-bg-calm.png");`
  - Re-rasterized `assets/background/streak-bg-calm.png` from the sharper source and visually confirmed the new asset directly.
  - Verification:
    - start screen: `output/manual-check/background-calm-sharp-start-v1/shot-0.png`
    - game screen: `output/manual-check/background-calm-sharp-game-v1/shot-0.png`
- Calm background composition correction after the user noted it still did not resemble the supplied reference:
  - Rebuilt `assets/background/streak-bg-calm-source.svg` as a wide composition for the actual game viewport instead of continuing to tune a square asset.
  - Matched the reference structure more directly:
    - top-left pink halftone cloud with white cut slash and heart cluster
    - top-right purple swoosh cluster with white bands and star accents
    - lower-left cyan feathered brush cluster
    - lower-left / bottom purple sweep
    - right-side gold arc with pink support slash and black accent line
    - open paper center with light confetti and grain
  - Stopped using QuickLook to rasterize the final PNG because it was outputting a square preview and distorting the intended composition.
  - Final PNG now comes from Chromium rendering of the SVG source:
    `assets/background/streak-bg-calm.png` is `2048 x 1152`.
  - Verification:
    - asset preview checked directly from `assets/background/streak-bg-calm.png`
    - start screen: `output/manual-check/background-calm-wide-start-v1/shot-0.png`
    - game screen: `output/manual-check/background-calm-wide-game-v1/shot-0.png`
- 2026-03-13 cleanup pass without logic changes:
  - Removed dead JS/CSS pieces that were no longer used:
    `escapeHtml`, `showRoundOverlay`, stale `currentStatus`/`playersEdges` hooks, and an unused `activeAnimations` state field.
  - Simplified `src/app-main.js` startup/reset flow:
    removed the trivial `getHumanCount()` wrapper, added `resetUiAnimState()`, and normalized file formatting without changing turn logic.
  - Cleaned the project tree from non-runtime artifacts:
    deleted `output/`, `assets/demo/`, `.DS_Store` files, the unused `theme-afterhours-poster.css`, the empty `package-lock.json`, and unused legacy art assets no longer referenced by HTML/CSS/JS.
  - Added `.gitignore` for recurring generated clutter:
    `.DS_Store`, `output/`, `assets/demo/`.
  - Verification:
    - `node --check src/app-core.js`
    - `node --check src/app-ui.js`
    - `node --check src/app-main.js`
    - Playwright smoke-check after cleanup:
      `output/manual-check/cleanup-smoke/shot-0.png`
- 2026-03-13 project structure rename / navigation pass:
  - Renamed runtime code to clearer entry points:
    - `src/app-core.js` -> `src/game-logic.js`
    - `src/app-ui.js` -> `src/game-ui.js`
    - `src/app-main.js` -> `src/game-bootstrap.js`
  - Moved styles into dedicated folders:
    - `styles.css` -> `styles/base.css`
    - `theme-underground-comic.css` -> `styles/themes/underground-comic.css`
  - Normalized asset layout for easier scanning:
    - background -> `assets/backgrounds/main-stage-background.*`
    - deck back -> `assets/cards/back/deck-back.png`
    - shared SVG patterns -> `assets/patterns/`
    - clearer action-card filenames (`second-chance.svg`, `flip-three.svg`, `generic-action.svg`)
  - Moved planning/reference materials out of the app root into `docs/`:
    - `docs/project-board.canvas`
    - `docs/planning/*`
  - Deleted empty leftovers after the move:
    - old `planning/`, old `assets/background/`, regenerated `output/`
  - Updated all runtime references in `index.html`, CSS, and doc canvases to match the new structure.
  - Verification:
    - `node --check src/game-logic.js`
    - `node --check src/game-ui.js`
    - `node --check src/game-bootstrap.js`
    - Playwright smoke-check after renaming:
      `/tmp/streak-structure-check/shot-0.png`
