# Firestore rules tests (roadmap item 3b)

These tests run `firestore.rules` against the Firestore emulator with
`@firebase/rules-unit-testing`. They are **not** part of the Jest suite: they use
the Node built-in test runner and live outside any `__tests__` directory, so
Jest's `testMatch` never picks them up. The required packages
(`firebase`, `@firebase/rules-unit-testing`) are resolved via `NODE_PATH`; do
**not** add them to `package.json`.

Run from the project root:

```bash
PATH=/tmp/claude-1000/-home-voidaadmin-ankaokul--claude-worktrees-lingua-setup-verification-79483f/4760f2c1-7747-4522-a5d9-c65847c4bfec/scratchpad/jre/bin:$PATH \
FIREBASE_EMULATORS_PATH=/tmp/claude-1000/-home-voidaadmin-ankaokul--claude-worktrees-lingua-setup-verification-79483f/4760f2c1-7747-4522-a5d9-c65847c4bfec/scratchpad/fb-emu \
XDG_CONFIG_HOME=/tmp/claude-1000/-home-voidaadmin-ankaokul--claude-worktrees-lingua-setup-verification-79483f/4760f2c1-7747-4522-a5d9-c65847c4bfec/scratchpad/xdg \
NODE_PATH=/tmp/claude-1000/-home-voidaadmin-ankaokul--claude-worktrees-lingua-setup-verification-79483f/4760f2c1-7747-4522-a5d9-c65847c4bfec/scratchpad/fbtools/node_modules \
/tmp/claude-1000/-home-voidaadmin-ankaokul--claude-worktrees-lingua-setup-verification-79483f/4760f2c1-7747-4522-a5d9-c65847c4bfec/scratchpad/fbtools/node_modules/.bin/firebase \
emulators:exec --only firestore --project demo-lovevox "node --test firestore-tests/"
```

`firebase emulators:exec` starts the emulator (port from `firebase.json`,
default 8080), sets `FIRESTORE_EMULATOR_HOST`, and runs the command.
