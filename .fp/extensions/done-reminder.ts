import type { ExtensionInit } from "@fiberplane/extensions";

const REMINDER = `
┌─────────────────────────────────────────────────────────┐
│  BEFORE YOU MOVE ON — did you:                          │
│                                                         │
│  □ Run code review (subagent) if this was a medium-to-  │
│    large chunk of work?                                 │
│                                                         │
│  □ Update docs/ if you made architectural or flow       │
│    decisions? Use the drift skill to link specs to the  │
│    relevant source files.                               │
└─────────────────────────────────────────────────────────┘`.trimStart();

const init: ExtensionInit = (fp) => {
  fp.on("issue:status:changed", ({ to }) => {
    if (to !== "done") {
      return;
    }

    for (const line of REMINDER.split("\n")) {
      fp.log.warn(line);
    }
  });
};

export default init;
