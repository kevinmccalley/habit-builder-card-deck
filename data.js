// Habit-Builder Card Deck — evergreen fixed-content deck, NOT a quiz-and-bank
// product. Every buyer gets the same 44 pre-written cards; the only
// per-buyer variation is light {name}/{goal} interpolation on the cover
// card and the 3 dedicated goal cards (handled at PDF-generation time,
// not here — this file is the fixed content bank only).
//
// Card count: 1 cover + 4 framework + 24 prompt + 8 tracker + 6 reflection
// + 3 goal + 2 motivation = 48 cards total. This file defines the 44 that
// are the same for every buyer (everything except cover + 3 goal cards).
//
// Content-sourcing constraint (locked 2026-08-12): public-domain habit-
// science CONCEPTS only (the cue-routine-reward loop, habit stacking, the
// ~66-day formation window, "never miss twice") — no verbatim phrasing
// pulled from any single book or author. These ideas are widely described
// across behavioral psychology, not owned by one source.

const HABIT_DECK_DATA = {
  promptCategories: [
    { id: "health_fitness", label: "Health & Fitness" },
    { id: "mindfulness", label: "Mindfulness & Mental Health" },
    { id: "productivity", label: "Productivity & Focus" },
    { id: "home_relationships", label: "Home & Relationships" }
  ],

  // --- 4 framework cards -----------------------------------------------
  // Explain the mental model before the buyer gets to the prompt cards.
  framework: [
    {
      id: "FW01",
      title: "The Habit Loop",
      body: "Every habit runs on three parts: a cue that triggers it, a routine that is the habit itself, and a reward that makes your brain want to repeat it. Most habits fail not because of weak willpower, but because one of these three pieces is missing or unclear. Fix the loop, and the habit gets easier to keep — not because you got more disciplined, but because the loop is doing the work."
    },
    {
      id: "FW02",
      title: "Habit Stacking",
      body: "The easiest way to build a new habit is to attach it to one you already have. Instead of trying to remember a new habit on its own, tie it to something you already do every day without thinking — right after your coffee, right after you brush your teeth, right after you sit down at your desk. The old habit becomes the cue for the new one."
    },
    {
      id: "FW03",
      title: "The Two-Minute Rule",
      body: "Start smaller than feels reasonable. A new habit should take less than two minutes the first few weeks — not because that's the whole goal, but because showing up is the actual habit you're building. \"Read before bed\" becomes \"read one page.\" \"Work out\" becomes \"put on my shoes.\" Master showing up first; intensity can grow later."
    },
    {
      id: "FW04",
      title: "Don't Break the Chain",
      body: "Once a habit is running, the goal shifts from doing it perfectly to not missing it twice in a row. A visible streak — even a simple string of checkmarks — makes the pattern real in a way that memory alone doesn't. The tracker cards in this deck exist for exactly this: something to mark, something to look at, something to not want to break."
    }
  ],

  // --- 24 cue-routine-reward prompt cards, 6 per category --------------
  // Ready-to-adopt templates the buyer can use as-is or as inspiration
  // for their own version of the same loop.
  prompts: [
    // Health & Fitness
    { id: "HF01", category: "health_fitness", cue: "After I pour my morning coffee", routine: "I'll do 10 push-ups", reward: "Enjoy the coffee guilt-free" },
    { id: "HF02", category: "health_fitness", cue: "After I brush my teeth at night", routine: "I'll stretch for 2 minutes", reward: "Notice how much looser I feel getting into bed" },
    { id: "HF03", category: "health_fitness", cue: "After I sit down at my desk", routine: "I'll drink a full glass of water", reward: "Cross it off before the day gets busy" },
    { id: "HF04", category: "health_fitness", cue: "After I park my car", routine: "I'll take the stairs instead of the elevator", reward: "Feel my heart rate for a second — that's the habit working" },
    { id: "HF05", category: "health_fitness", cue: "After I finish dinner", routine: "I'll go for a 10-minute walk", reward: "Watch the sunset or listen to one song I like" },
    { id: "HF06", category: "health_fitness", cue: "After I wake up", routine: "I'll drink a glass of water before anything else", reward: "Start the day already ahead" },

    // Mindfulness & Mental Health
    { id: "MF01", category: "mindfulness", cue: "After I sit down on my commute", routine: "I'll take 5 slow breaths", reward: "Notice my shoulders drop" },
    { id: "MF02", category: "mindfulness", cue: "After I close my laptop for the day", routine: "I'll write down one thing that went well", reward: "End the workday on my terms" },
    { id: "MF03", category: "mindfulness", cue: "After I wake up", routine: "I'll name one thing I'm looking forward to", reward: "Start the day with something to hold onto" },
    { id: "MF04", category: "mindfulness", cue: "After I feel my phone buzz", routine: "I'll take one breath before I check it", reward: "Notice I'm back in control of my attention" },
    { id: "MF05", category: "mindfulness", cue: "After I get into bed", routine: "I'll think of one good moment from today", reward: "Fall asleep on a good note" },
    { id: "MF06", category: "mindfulness", cue: "After I feel my jaw clench", routine: "I'll unclench it and drop my shoulders", reward: "Feel the tension actually leave" },

    // Productivity & Focus
    { id: "PF01", category: "productivity", cue: "After I sit down at my desk", routine: "I'll write my top 3 priorities for the day", reward: "Start working already knowing what matters" },
    { id: "PF02", category: "productivity", cue: "After I finish a meeting", routine: "I'll write down the one next action", reward: "Nothing falls through the cracks" },
    { id: "PF03", category: "productivity", cue: "After I open my laptop", routine: "I'll close every tab I don't need right now", reward: "Start with a clear screen and a clear head" },
    { id: "PF04", category: "productivity", cue: "After lunch", routine: "I'll do my hardest task first, for just 10 minutes", reward: "Get the dread out of the way early" },
    { id: "PF05", category: "productivity", cue: "After I feel the urge to check email", routine: "I'll finish my current sentence or task first", reward: "Notice how much more I get done" },
    { id: "PF06", category: "productivity", cue: "After I shut down my computer", routine: "I'll write tomorrow's first task on a sticky note", reward: "Walk away without carrying the day with me" },

    // Home & Relationships
    { id: "HR01", category: "home_relationships", cue: "After I walk in the door", routine: "I'll put my keys and bag in the same spot", reward: "Never lose 5 minutes looking for them again" },
    { id: "HR02", category: "home_relationships", cue: "After dinner", routine: "I'll load the dishes right away", reward: "Wake up to a clean kitchen" },
    { id: "HR03", category: "home_relationships", cue: "After I get a text from someone I love", routine: "I'll reply within the hour, even briefly", reward: "Notice the relationship feels lighter" },
    { id: "HR04", category: "home_relationships", cue: "After I sit down for dinner", routine: "I'll ask one real question and put my phone away", reward: "Actually hear the answer" },
    { id: "HR05", category: "home_relationships", cue: "After I wake up", routine: "I'll make the bed before I leave the room", reward: "Come home to one thing already done" },
    { id: "HR06", category: "home_relationships", cue: "After I say goodnight", routine: "I'll say one specific thing I appreciated about today", reward: "End the day feeling closer, not just tired" }
  ],

  // --- 8 tracking/streak cards -------------------------------------------
  // All three tracker formats ship as fixed cards for every buyer (open
  // question resolved 2026-08-12) — no format-selection UI needed, keeps
  // this fully evergreen. "format" drives the PDF layout, not the card text.
  trackers: [
    { id: "TR01", title: "30-Day Tracker", format: "grid-30", body: "Mark one box for every day you show up. Thirty boxes, one habit, no pressure to be perfect — just present." },
    { id: "TR02", title: "Weekly Tracker", format: "grid-7", body: "A simple week at a glance. Photocopy or reprint this one as many times as you need." },
    { id: "TR03", title: "Monthly Overview", format: "calendar-month", body: "See the whole month at once. Patterns are easier to spot in a grid than in memory." },
    { id: "TR04", title: "Day 7 — One Week In", format: "milestone", body: "You showed up seven times. That's not nothing — that's a pattern starting." },
    { id: "TR05", title: "Day 21 — Three Weeks", format: "milestone", body: "Three weeks in. It's starting to feel less like a decision and more like just what you do." },
    { id: "TR06", title: "Day 30 — One Month", format: "milestone", body: "A full month. Whatever this was when you started, it's something else now." },
    { id: "TR07", title: "Day 66 — The Habit Line", format: "milestone", body: "Research suggests it takes roughly two months for a new behavior to start feeling automatic. You're there." },
    { id: "TR08", title: "Day 100 — The Triple Digits", format: "milestone", body: "One hundred days. This isn't a streak anymore. This is who you are now." }
  ],

  // --- 6 reflection/reset cards -------------------------------------------
  // What to do on the days it doesn't go well — this deck assumes slips
  // happen and plans for them instead of pretending they won't.
  reflection: [
    { id: "RF01", title: "If You Miss a Day", body: "One missed day is an accident. Two in a row is the start of a new habit — don't let it be that one. Just start again tomorrow." },
    { id: "RF02", title: "The Restart Rule", body: "Never miss twice. If you slip today, the only job tomorrow is showing up, even in the smallest possible way." },
    { id: "RF03", title: "Lower the Bar, Don't Quit", body: "If the habit feels too big today, do a smaller version of it. Ten push-ups can become one. One counts." },
    { id: "RF04", title: "What Almost Stopped You?", body: "Write down what got in the way today. Naming it makes it easier to plan around next time." },
    { id: "RF05", title: "Celebrate the Boring Days", body: "The days you almost skipped it but did it anyway matter more than the easy ones. Give yourself credit for those." },
    { id: "RF06", title: "You're Allowed to Adjust", body: "If a habit isn't working, change the habit — not your belief that you can build one." }
  ],

  // --- 2 motivation/quote cards -------------------------------------------
  // Original phrasing only — deliberately not paraphrasing any specific
  // published author's language, per the content-sourcing constraint above.
  motivation: [
    { id: "MO01", body: "Every habit starts as a decision and ends as an identity. Which one are you building today?" },
    { id: "MO02", body: "You don't need motivation to keep going. You need a system small enough that motivation doesn't matter." }
  ],

  // --- Personalized cards (templates only — filled at generation time) ---
  // Cover card: "{name}'s Habit-Builder Deck" if a name is entered, else
  // a generic "Habit-Builder Deck" title. Goal cards: up to 3 buyer-entered
  // goals/habits, one per card, printed back with a consistent template
  // ("MY GOAL" label + the buyer's own text) — no pre-written content here
  // since the whole point is that it's THEIRS, not a bank pick.
  personalizedTemplates: {
    cover: { titleWithName: "{name}'s Habit-Builder Deck", titleWithoutName: "Habit-Builder Deck", subtitle: "Small habits. Real change." },
    goalCard: { label: "MY GOAL", placeholderIfEmpty: "Write in your own habit or goal" }
  }
};
