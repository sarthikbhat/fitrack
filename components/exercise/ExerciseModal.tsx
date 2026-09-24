"use client";

// How-to modal (legacy `renderModal`, 1974-2024). Hero media priority:
//   EDB-with-videos MP4 ("Video") → ExerciseDB GIF ("Live") → free-exercise-db
//   2-frame loop ("Motion") → single frame → coloured monogram. Below: meta chips,
//   PR records (from exStats over the store's logged map), a technique guide
//   (free-exercise-db instructions, else ExerciseDB, else EDB overview, else a
//   sensible fallback), and a YouTube search link.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PLAN } from "@/data/plan";
import { LIBRARY } from "@/data/library";
import { mc } from "@/data/muscles";
import { getEx, cdnImg, useExdbReady, isExdbLoaded } from "@/lib/exdb";
import { loadXdb, peekXdb, type XdbEntry } from "@/lib/xdb";
import { useEdbReady, matchEdb, loadEdbDetail, type EdbDetail } from "@/lib/edb";
import { exStats } from "@/lib/exStats";
import { useStore } from "@/lib/store";
import { massLabel, type MassUnit } from "@/lib/units";
import { Icon } from "@/data/icons";
import { initials } from "@/components/exercise/Thumb";
import { MuscleMap } from "@/components/exercise/MuscleMap";
import { useExerciseModal } from "@/components/exercise/ExerciseModalProvider";

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Display-only prettifier for EDB's UPPERCASE API vocabulary (e.g. "TRICEPS BRACHII"
// → "Triceps Brachii"). The exact API value is kept for the click→filter param.
const titleCase = (s: string): string =>
  s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;

function muscleFor(name: string): string {
  let mus = "";
  PLAN.forEach((d) => d.ex.forEach((e) => { if (e.name === name) mus = e.muscle; }));
  if (!mus) {
    const l = LIBRARY.find((x) => x.name === name);
    if (l) mus = l.muscle;
  }
  return mus;
}

export function ExerciseModal({
  name,
  edbId,
  onClose,
}: {
  name: string;
  edbId?: string;
  onClose: () => void;
}) {
  const ready = useExdbReady();
  const edbReady = useEdbReady();
  const logged = useStore((s) => s.logged);
  const unit = useStore((s) => (s.profile?.units.mass ?? "kg") as MassUnit);
  const uLbl = massLabel(unit);
  const sex = useStore((s) => (s.profile?.sex ?? "male") as "male" | "female");
  const { openExerciseById } = useExerciseModal();
  const router = useRouter();

  // Tapping a meta chip jumps to the Library filtered by that tag: close the modal, clear
  // the scroll-lock, then deep-link with the AscendAPI param the Library reads on mount.
  const filterBy = (param: "bodyParts" | "equipments" | "targetMuscles", value: string) => {
    onClose();
    document.body.classList.remove("locked");
    router.push(`/library?${param}=${encodeURIComponent(value)}`);
  };

  const [xdb, setXdb] = useState<XdbEntry | undefined>(() => peekXdb(name));
  const [edb, setEdb] = useState<EdbDetail | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Re-peek the cached record synchronously when the exercise changes (adjust-during-render,
  // not an effect — avoids a cascading set-state-in-effect render).
  const [prevName, setPrevName] = useState(name);
  if (prevName !== name) {
    setPrevName(name);
    setXdb(peekXdb(name));
    setEdb(null);
  }

  // Fetch the ExerciseDB record on open; re-render when it resolves.
  useEffect(() => {
    let alive = true;
    loadXdb(name).then((v) => { if (alive) setXdb(v); });
    return () => { alive = false; };
  }, [name]);

  // Source C. Two paths to the EDB detail record (video/overview/image):
  //  - id-open (catalog): fetch loadEdbDetail(edbId) directly, skipping name-matching.
  //  - name-open (local-first): match the name against the cached EDB index, then pull
  //    its detail. Re-runs once the index becomes ready. Both fail silently → no video.
  useEffect(() => {
    let alive = true;
    if (edbId) {
      loadEdbDetail(edbId).then((d) => { if (alive) setEdb(d); });
      return () => { alive = false; };
    }
    const m = matchEdb(name);
    if (!m) return;
    loadEdbDetail(m.id).then((d) => { if (alive) setEdb(d); });
    return () => { alive = false; };
  }, [name, edbId, edbReady]);

  // Body scroll lock (legacy `.locked`).
  useEffect(() => {
    document.body.classList.add("locked");
    return () => document.body.classList.remove("locked");
  }, []);

  // Focus the close button on open.
  useEffect(() => {
    closeRef.current?.focus();
  }, [name]);

  // Escape to close + Tab focus trap.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        onClose();
        return;
      }
      if (ev.key === "Tab") {
        const root = overlayRef.current;
        if (!root) return;
        const f = root.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])',
        );
        if (!f.length) return;
        const first = f[0],
          last = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === first) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && document.activeElement === last) {
          ev.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const displayName = name || edb?.name || "Exercise";
  const mus = muscleFor(name);
  const e = getEx(name);
  const col = mc(mus);
  const x: Partial<XdbEntry> = xdb || {};
  const gif = x.gif;
  const video = edb?.videoUrl;
  const edbImg = edb?.imageUrl; // catalog id-open: still image when no video is available

  const meta = (
    e
      ? [e.eq && cap(e.eq), e.lv && cap(e.lv), ...(e.pm || []).map(cap)]
      : [x.eq && cap(x.eq), x.target && cap(x.target)]
  ).filter(Boolean) as string[];

  const st = exStats(logged, name);
  const steps = e && e.ins.length ? e.ins : x.ins && x.ins.length ? x.ins : null;
  const overview = edb?.overview;

  // Rich EDB detail (id-open, or name-open where matchEdb resolved an id). Each section
  // renders only when non-empty; the muscle map is fed EDB's muscle vocabulary directly.
  const target = edb?.targetMuscles ?? [];
  const secondary = edb?.secondaryMuscles ?? [];
  // Each chip carries the Library filter param it maps to: equipment → equipments,
  // body part → bodyParts, target & secondary muscle → targetMuscles.
  const detailChips: { value: string; param: "bodyParts" | "equipments" | "targetMuscles" }[] = [
    ...(edb?.equipments ?? []).map((v) => ({ value: v, param: "equipments" as const })),
    ...(edb?.bodyParts ?? []).map((v) => ({ value: v, param: "bodyParts" as const })),
    ...target.map((v) => ({ value: v, param: "targetMuscles" as const })),
    ...secondary.map((v) => ({ value: v, param: "targetMuscles" as const })),
  ].filter((c) => c.value);
  // When EDB detail loaded (id-open, or name-open where matchEdb resolved), the EDB chips
  // above are the authoritative tags — suppress the stale free-exercise-db metarow entirely.
  const hasEdbDetail = detailChips.length > 0;
  const instructions = edb?.instructions ?? [];
  const tips = edb?.exerciseTips ?? [];
  const variations = edb?.variations ?? [];
  const related = edb?.relatedExerciseIds ?? [];

  const hideImg = (ev: React.SyntheticEvent<HTMLImageElement>) => {
    ev.currentTarget.style.display = "none";
  };

  return (
    <div className="overlay" ref={overlayRef} onMouseDown={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={displayName}>
        <button className="close" ref={closeRef} onClick={onClose} aria-label="close">
          <Icon name="close" />
        </button>
        <div className="hero kb">
          {video ? (
            <>
              <video
                className="fr fr0"
                src={video}
                autoPlay
                muted
                loop
                playsInline
                poster={edb?.imageUrl || undefined}
              />
              <span className="demo">
                <Icon name="play" /> Video
              </span>
            </>
          ) : gif ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="fr fr0" src={gif} alt={name} onError={hideImg} />
              <span className="demo">
                <Icon name="play" /> Live
              </span>
            </>
          ) : e ? (
            e.imgs.length > 1 ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="fr fr0" src={cdnImg(e.imgs[0], 800)} alt={name} onError={hideImg} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="fr fr1" src={cdnImg(e.imgs[1], 800)} alt="" onError={hideImg} />
                <span className="demo">
                  <Icon name="play" /> Motion
                </span>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="fr fr0" src={cdnImg(e.imgs[0], 800)} alt={name} onError={hideImg} />
            )
          ) : edbImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="fr fr0" src={edbImg} alt={displayName} onError={hideImg} />
          ) : (
            <div className="noimg">
              <span className="ph" style={{ ["--phc" as string]: col, fontSize: 44 }}>
                {initials(displayName)}
              </span>
            </div>
          )}
          <div className="grad" />
          <div className="cap">
            <div className="eyebrow upper" style={{ color: col }}>{mus}</div>
            <div className="capname">
              <h3 className="cond">{displayName}</h3>
              <a
                className="ytbtn"
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(displayName + " proper form technique")}`}
                target="_blank"
                rel="noopener"
                aria-label="Watch on YouTube"
              >
                <Icon name="youtube" />
              </a>
            </div>
          </div>
        </div>
        <div className="content">
          {!hasEdbDetail && meta.length > 0 && (
            <div className="metarow">
              {meta.map((m, i) => (
                <span className="chip" key={i}>{m}</span>
              ))}
            </div>
          )}
          {st && (
            <div className="records">
              <div className="rec">
                <b className="cond">{st.bestTxt}</b>
                <span>best set</span>
              </div>
              <div className="rec">
                <b className="cond">{st.best1} {uLbl}</b>
                <span>est. 1RM</span>
              </div>
              {st.last && (
                <div className="rec">
                  <b className="cond">
                    {new Date(st.last + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </b>
                  <span>last done</span>
                </div>
              )}
            </div>
          )}
          {overview && <p className="overview">{overview}</p>}
          {steps ? (
            <ol className="steps">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          ) : overview ? null : !ready && !isExdbLoaded() && !x.done && !gif ? (
            <div className="loading-steps">Loading technique guide…</div>
          ) : (
            <div className="loading-steps">
              No step-by-step guide found in the open databases. Focus on: controlled tempo, full range of motion, and
              bracing your core throughout the movement.
            </div>
          )}

          {target.length > 0 && (
            <MuscleMap targetMuscles={target} secondaryMuscles={secondary} gender={sex} />
          )}

          {detailChips.length > 0 && (
            <div className="detail-section">
              <div className="metarow">
                {detailChips.map((c, i) => (
                  <button
                    type="button"
                    className="chip chip-tap"
                    key={i}
                    onClick={() => filterBy(c.param, c.value)}
                    aria-label={`Filter library by ${titleCase(c.value)}`}
                  >
                    {titleCase(c.value)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {instructions.length > 0 && (
            <div className="detail-section">
              <h4 className="detail-h">Instructions</h4>
              <ol className="steps">
                {instructions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}

          {tips.length > 0 && (
            <div className="detail-section">
              <h4 className="detail-h">Tips</h4>
              <ul className="detail-list">
                {tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {variations.length > 0 && (
            <div className="detail-section">
              <h4 className="detail-h">Variations</h4>
              <ul className="detail-list">
                {variations.map((v, i) => (
                  <li key={i}>{cap(v)}</li>
                ))}
              </ul>
            </div>
          )}

          {related.length > 0 && (
            <div className="detail-section">
              <h4 className="detail-h">Related exercises</h4>
              <div className="related-rows">
                {related.map((rid) => (
                  <button
                    key={rid}
                    type="button"
                    className="related-row"
                    onClick={() => openExerciseById(rid)}
                  >
                    <span>View related exercise</span>
                    <Icon name="caret" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
