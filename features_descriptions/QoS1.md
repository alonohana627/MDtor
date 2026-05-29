# Feature Phase — Workflow Friction Reduction

Goal:

This phase exists to remove friction from the workflows users perform constantly.

Do not measure success by the number of features added.

Measure success by how many annoying actions disappear.

For every proposed improvement, ask:

    "Does this remove friction from a task the user performs many times per day?"

If the answer is no, it is out of scope.

Priority Areas:

- Keyboard shortcuts
- File navigation speed
- Editing comfort
- Save workflow
- Layout usability
- Focus management
- Workflow continuity

Examples of valuable improvements:

- Ctrl+S save
- Ctrl+O open folder
- Ctrl+P quick file switcher
- Remember last opened file
- Better dirty-state handling
- Auto-save
- Improved scroll synchronization
- Faster pane resizing
- Smarter editor focus behavior

Examples of poor improvements:

- Large settings systems
- Rarely used commands
- Feature-heavy menus
- Customization for the sake of customization
- Complex editor features that do not improve daily workflows

Decision Rule:

If forced to choose between:

    A new feature

and

    Making an existing workflow noticeably smoother

always choose the smoother workflow.

Success Criteria:

The editor feels:

- Faster
- More responsive
- Less annoying
- More comfortable for long writing sessions

Users should spend less time interacting with the application and more time writing.

Agent Rules:

Implement one workflow improvement at a time.

After each implementation:

    npm run build

or

    npm test

Validate.

Only then move to the next improvement.