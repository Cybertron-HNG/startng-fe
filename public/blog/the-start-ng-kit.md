# The start.ng Kit: sign-in, scores and sharing in one line

A game on start.ng doesn't need its own accounts, database or share buttons. start.ng is its backend. The quickest way to use it is the **start.ng Kit**: one script tag.

```html
<script src="https://start.ng/kit.js" defer></script>
```

## What players get

As soon as the Kit loads, your game is connected to start.ng:

- A **"← start.ng" button** in the top left, so players can find more games.
- A small **"Made on start.ng" badge** in the bottom right.
- **Sign-in that just works.** A player who is already signed in on start.ng is signed in to your game too, with the character they made. They play as themselves in every game.

## Save a score in one call

At the end of a round, call:

```js
startng.gameOver({ score: 1250 });
```

That saves the run to your game's leaderboard and shows the end-of-round card: the score, the player's rank, anything they unlocked, a **Play again** button and **Share on X**. If your game has its own leaderboard columns (described in its `startng.json`), pass them as `stats` instead of `score`.

Players who aren't signed in see "Sign in to save your score." on the same card, with a **Sign in with start.ng** button.

## The other calls

| Call | What it does |
|---|---|
| `startng.getPlayer()` | Who is playing, or that they're a guest |
| `startng.onPlayerChange(fn)` | Tells you when the player signs in or out |
| `startng.signIn()` | Sends the player to start.ng to sign in, then back |
| `startng.saveRun(stats)` | Saves a run without showing the card |
| `startng.getLeaderboard(limit)` | The top players |
| `startng.share({ score })` | Opens an X post with the result and a link to your game |

## It meets the game standards

The back button, the badge and the card's **Share on X** button are start.ng's three game standards. A game that loads the Kit and calls `startng.gameOver()` at the end of a round meets all three. Games that meet the standards can be picked for the daily tournament.

You can turn the button or the badge off with `data-back="off"` or `data-badge="off"` on the script tag, as long as you add your own link back to start.ng.

## Next steps

- New to start.ng? Start with [how to publish a browser game](/blog/publish-a-browser-game).
- The full reference, including the manual way without the Kit, is in [the docs](/docs).
