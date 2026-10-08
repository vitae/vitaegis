---
description: Use when planning a day or week of posts, choosing topics, or deciding which format a subject deserves.
---

# Content strategy

## The loop

1. `pipeline_status`: what is waiting on the operator, what failed, which accounts work.
2. `list_posts` with status `published` and a limit of 20: what went out lately, which pillars
   and formats. Avoid repeating a topic within two weeks.
3. `research` with view `briefs`: ready briefs are the strongest material. A brief with real
   findings beats a topic invented from a dossier entry.
4. `growth_briefs`: what yesterday's plan said. Follow through on it or say why not.
5. Pick the slots. Rotate pillars. Match format to subject (see the `platform-rules` skill).
6. For each slot, write a brief for `queue_post`. If the copy matters, delegate the brief to
   the `copywriter` subagent first and queue its output.
7. Report: what you queued, what it will cost, and what the operator must approve.

## What a good post brief contains

- The subject in one line, and the pillar.
- The angle: the one thing the viewer should walk away believing or doing.
- The hook: the first line, written out.
- Two or three concrete points, with a number or a mechanism where there is one.
- The takeaway or the practice to try today.
- Any signature phrase that fits (at most one). "Wealth Whispers" for money lessons,
  "Wealth of Wisdom" for a teaching framed as capital.

Keep it under 120 words. The caption stage expands it per platform.

## Topic sources, in order of strength

1. A ready research brief (evidence, quotes, recurrence across sources).
2. A dossier entry from the pillars (the agent already knows these).
3. A seasonal or news hook found with the `researcher` subagent or Firecrawl.
4. A product moment: KeyCrate feature, a class date, a book.

## Formats by intent

| Intent                      | Format | Why                                              |
| --------------------------- | ------ | ------------------------------------------------ |
| Teach a protocol in steps   | slides | Four slides map to hook, two steps, takeaway.    |
| Make someone feel something | video  | Motion and sound; costs the most.                |
| One striking line or quote  | image  | A still with the line is enough.                 |
| Sell a product or a class   | slides | Hook, what it is, proof, link.                   |

## Review ceiling

Never leave more than five posts in `ready`. The operator approves one at a time, and a
backlog means the ideas rot. Write extra ideas into the growth brief.
