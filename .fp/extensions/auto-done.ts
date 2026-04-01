import type { ExtensionInit } from "@fiberplane/extensions";

const init: ExtensionInit = (fp) => {
  // Block marking a parent as done if any children are still open
  fp.on("issue:status:changing", async ({ issue, to }) => {
    if (to !== "done") {
      return undefined;
    }

    const children = await fp.issues.list({ parent: issue.id });
    const notDone = children.filter((child) => child.status !== "done");

    if (notDone.length > 0) {
      const titles = notDone.map((c) => c.title).join(", ");
      return {
        code: "CHILDREN_NOT_DONE",
        message: `Cannot mark as done — ${notDone.length} child issue(s) still open: ${titles}`,
      };
    }

    return undefined;
  });

  // When a child is marked done, check if all siblings are done too — if so, mark parent done
  fp.on("issue:status:changed", async ({ issue, to }) => {
    if (to !== "done" || !issue.parent) {
      return;
    }

    const siblings = await fp.issues.list({ parent: issue.parent });
    const allDone = siblings.every((sibling) => sibling.status === "done");

    if (allDone) {
      const parent = await fp.issues.get(issue.parent);
      if (parent && parent.status !== "done") {
        await fp.issues.update(issue.parent, { status: "done" });
        fp.log.info(`Auto-marked parent "${parent.title}" as done — all children complete`);
      }
    }
  });

  fp.log.info("Auto-done extension loaded");
};

export default init;
