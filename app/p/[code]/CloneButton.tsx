"use client";

// "Clone to my app" for the public shared-plan page. Saves the shared plan into
// the local store (works fully signed-out; the sync engine picks it up later when
// signed in), then offers a link into the app. Nutrition clones replace the
// recurring plan, so they confirm first. Disabled until the store has hydrated so
// a clone can never be clobbered by a late rehydrate.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useConfirm } from "@/components/ConfirmProvider";
import { Icon } from "@/data/icons";
import type { ShareKind } from "@/lib/share";
import type { Plan, Program } from "@/lib/types";

export function CloneButton({
  kind,
  data,
  title,
}: {
  kind: ShareKind;
  data: unknown;
  title: string;
}) {
  const hydrated = useStore((s) => s.hydrated);
  const importProgram = useStore((s) => s.importProgram);
  const importPlan = useStore((s) => s.importPlan);
  const confirm = useConfirm();
  const router = useRouter();
  const [done, setDone] = useState(false);

  const dest = kind === "program" ? "/program" : "/nutrition";

  const onClone = async () => {
    if (!hydrated) return;
    if (kind === "program") {
      importProgram(data as Program);
    } else {
      const ok = await confirm({
        title: "Replace your meal plan?",
        message:
          "Cloning this plan replaces your current recurring meals. Your daily food logs are kept. This can't be undone.",
        confirmLabel: "Replace",
        danger: true,
      });
      if (!ok) return;
      importPlan(data as Plan);
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="share-clone-done">
        <p className="share-clone-msg">
          <Icon name="check" />
          &nbsp;Saved <b>{title}</b> to your app.
        </p>
        <button className="btn primary" onClick={() => router.push(dest)}>
          Open in app
        </button>
      </div>
    );
  }

  return (
    <button className="btn primary share-clone-btn" onClick={onClone} disabled={!hydrated}>
      <Icon name="plus" />
      &nbsp;{hydrated ? "Clone to my app" : "Preparing…"}
    </button>
  );
}
