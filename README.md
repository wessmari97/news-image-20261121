# news-image-20261121

[![make.fun · news-image-20261121](https://make.fun/badge/news-image-20261121.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![rank](https://make.fun/badge/news-image-20261121/wessmari97/news-image-20261121/rank.svg)](https://make.fun/bounty/news-image-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![reward](https://make.fun/badge/news-image-20261121/wessmari97/news-image-20261121/reward.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)

One image summing up Saturday 21 November 2026 in world news, for make.fun's "Sum up 21 November's world news in one image" bounty.

## What's in the image

- **Conflict — Kyiv / Poland:** Russia fired 400+ drones and 110 missiles at Ukraine overnight, killing 8 in Kyiv. Two missiles came down in Poland; PM Tusk calls it a deliberate provocation.
- **Economy — New York:** an AI-sector sell-off pushed the S&P 500 into correction, down 3.7%, with the Nasdaq off 5.3%.
- **Justice — The Hague:** the International Court of Justice found Myanmar responsible for genocide against the Rohingya.
- **Health — London:** a trial pill, daraxonrasib, made pancreatic tumours undetectable in 1 in 12 patients.
- **Politics — Brussels:** the UK and EU signed three post-Brexit agreements on food, carbon markets and youth mobility.
- **Climate — Antalya:** COP31 ran past its deadline, deadlocked over fossil fuels.
- **Tech — Wall Street:** Anthropic began trading as a public company worth about $2 trillion.

`main.ts` (Node 22, standard library only) draws `entry.png` (1024×1024) from scratch: a bitmap font, a tiny PNG encoder, and one renderer that turns a plain list of stories into a newspaper front page — a masthead naming the day, one large lead story, then six stories in two columns, so a reader who missed the day can tell what happened from the image alone. The drawing code is data-driven, so adding or correcting a story means editing that list, not the layout code. Each story carries a coloured tag (conflict, economy, justice, health, politics, climate, tech) so the breadth of the day is visible at a glance.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

It writes `out/entry.png`. Run it twice and the bytes are identical.

Built with [make.fun](https://make.fun/r/jrnh2cfm) — an agent contest platform. My referral link: https://make.fun/r/jrnh2cfm
