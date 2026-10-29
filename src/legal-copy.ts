// The words of /privacy and /terms, in one place. LegalView.tsx draws them in the app and the build writes the same
// page into privacy.html and terms.html (vite.config.ts), so Google and people read exactly the same words.
//
// In the text, a link is written [the words people see](/the-address) and a bold run is **like this**; LegalView turns
// those into anchors and <b>, so the server's copy has real links too.

export type LegalSection = { heading: string; paragraphs: string[] };

export type LegalDoc = {
  eyebrow: string;
  title: string;
  intro: string;
  /** The date at the top, in plain words: "29 October 2026". */
  updated: string;
  sections: LegalSection[];
};

const UPDATED = "29 October 2026";

const PRIVACY: LegalDoc = {
  eyebrow: "Privacy",
  title: "Privacy policy",
  intro:
    "This page says what start.ng collects about you, why we collect it, how long we keep it, and what you can ask us to do about it.",
  updated: UPDATED,
  sections: [
    {
      heading: "Who we are",
      paragraphs: [
        "start.ng is a free home for browser games, run by the HNG community in Nigeria. We decide how the information on this page is used, so we are the ones to ask about it.",
      ],
    },
    {
      heading: "What we collect",
      paragraphs: [
        "**Your account.** You sign in with Google. When you do, we keep your email address, the name Google passes to us and a Google account identifier. We never see your Google password.",
        "**Your player page.** Your username, your character (name, colours and style), your level, badges, best scores, the games you favourited and the games you played.",
        "**Your play.** Which games you open and play, your scores, the tournaments you enter and how you did, and the coins and items you earn.",
        "**What you send us.** Reports you send about a game, and anything else you send to our team.",
        "**Visits.** On the live site we use Google Analytics, which records the pages you open, how you found us, roughly where you are (country and city) and what kind of device you use. See the section on cookies below.",
      ],
    },
    {
      heading: "Why we use it",
      paragraphs: [
        "We use it to sign you in and keep you signed in, to show your page, scores, leaderboards and tournaments, to send you the emails you asked for, to pay out coins and items, to keep the site safe and working, and to see which games and pages people use so we can improve them.",
        "We do not sell your information, we do not rent it, and we do not use it to show you adverts on other sites.",
      ],
    },
    {
      heading: "Your page is public unless you make it private",
      paragraphs: [
        "Every player gets a page with a link, showing your username, character, level, badges, best scores and favourite games. It is public by default. Anyone with the link can see it, and search engines can find it. Your email address is never shown on it.",
        "To make your page private, open [your profile](/me) and untick \u201cAnyone with the link can see my page\u201d. A private page answers \u201cnot found\u201d to everyone except you, and search engines are told to forget it.",
        "Leaderboards and tournament tables still show your username and scores while you play, because a board with no names on it is not a board. If your page is private, your username on a board does not lead anywhere.",
      ],
    },
    {
      heading: "Emails",
      paragraphs: [
        "We only email you about tournaments, results and start.ng news if you ask us to. Every email has a one-click unsubscribe link, and you can change or stop all of it on the [emails page](/emails).",
        "We keep a record of what you asked to receive and whether each email was delivered, so we do not keep sending you things you stopped, and so we can fix delivery problems.",
      ],
    },
    {
      heading: "Cookies, local storage and Google Analytics",
      paragraphs: [
        "When you sign in, we keep a sign-in token in your browser's local storage. It is what keeps you signed in. It is not used to follow you around other sites, and signing out removes it.",
        "On the live site we use Google Analytics (measurement ID G-9K8146WXDG) to count visits and see which games and pages people use. It sets Google's own cookies. We do not use Google Analytics to advertise to you, and we do not turn on its advertising features.",
        "Google sign-in uses Google's own cookies before you come back to start.ng. Those belong to Google and Google's privacy policy covers them.",
      ],
    },
    {
      heading: "Who else sees it",
      paragraphs: [
        "The people who run start.ng can see it, and so can the services that make the site work: Google (sign-in and analytics), our email provider, and our hosting provider. They may only use it to provide their service to us.",
        "We may also share it where the law requires it, or to protect someone from harm.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        "We keep your account, and the games, scores, coins and messages that belong to it, for as long as your account exists. When you ask us to delete your account, we delete it and the things that belong to it.",
        "We keep a record of the emails you asked for while you are subscribed. Our servers keep short-lived logs for security and for fixing faults. Google Analytics keeps visit data for a limited period set in our Google Analytics settings.",
      ],
    },
    {
      heading: "Your choices",
      paragraphs: [
        "You can ask us for a copy of what we hold about you, ask us to correct it, ask us to delete your account, or take back your permission for emails. Use the [emails page](/emails) for emails, and [your profile](/me) for your page and character.",
        "For anything else, email us at hello@start.ng and tell us what you want. We answer within 30 days. We may ask you a question or two first, so that we only ever give your information to you.",
        "If you are not happy with our answer, you can complain to the Nigeria Data Protection Commission (NDPC).",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "You sign in with a Google account, and Google only gives accounts to people aged 13 or older. If you are under 18, ask a parent or guardian before you sign in.",
        "If we learn that a child under 13 has an account, we delete it.",
      ],
    },
    {
      heading: "Changes to this page",
      paragraphs: [
        "If we change how we use your information, we change this page and the date at the top of it. If the change is important, we tell you the next time you sign in.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Questions, requests and complaints about your information: hello@start.ng. Our [terms of use](/terms) explain the rules for using start.ng.",
      ],
    },
  ],
};

const TERMS: LegalDoc = {
  eyebrow: "Terms",
  title: "Terms of use",
  intro:
    "These are the rules for playing games on start.ng, for your account, and for publishing a game of your own. They are written to be read, so they are shorter than most.",
  updated: UPDATED,
  sections: [
    {
      heading: "Agreeing to these terms",
      paragraphs: [
        "start.ng is run by the HNG community in Nigeria. By using start.ng, or by signing in, you agree to these terms. If you do not agree with them, please do not use the site.",
        "Our [privacy policy](/privacy) explains what we do with your information. It is part of these terms.",
      ],
    },
    {
      heading: "Your account",
      paragraphs: [
        "You sign in with Google. Keep your Google account safe, because anything done on start.ng while signed in as you is treated as done by you.",
        "Use one account, and use your own. Do not sign in as someone else, and do not sell or give your account away.",
        "You need to be old enough for a Google account (13 or older). If you are under 18, ask a parent or guardian before you sign in.",
      ],
    },
    {
      heading: "Playing on start.ng",
      paragraphs: [
        "Every game on start.ng is free to play in your browser. You do not need an account to play; you need one to keep scores, join tournaments and have a player page.",
        "Games are made by the community and by independent creators, so they change, and sometimes one breaks or is taken down. We do not promise that a game will always be there, or that it will always work.",
      ],
    },
    {
      heading: "Your username and character",
      paragraphs: [
        "Your username is the address of your page, so it has to be yours and has to be clean: no pretending to be another person, a game or start.ng itself, and nothing hateful, rude or unlawful. A name filter checks names as they are chosen, and we may hide or change a name that breaks these rules.",
        "Your character is yours to dress. It must follow the same rules as your username.",
      ],
    },
    {
      heading: "Playing fair",
      paragraphs: [
        "Scores and leaderboards only mean something if they are real. Do not use bots, scripts, modified copies of a game or bugs in it to get a score. Do not enter a tournament more than once, or with more than one account. We can remove a score, a place or an entry that was not earned.",
      ],
    },
    {
      heading: "Publishing a game",
      paragraphs: [
        "You can publish a browser game you made. By publishing it, you confirm that the game is yours to publish, and that everything in it (code, pictures, music, names) may be used that way.",
        "You keep your rights to your game. You give start.ng permission to host it, show it at its own address, list it with the other games, and show its name, cover and description to promote the site and your game. That permission lasts while your game is on start.ng.",
        "A game on start.ng must not contain malware, break the law, or collect players' information outside the player details start.ng gives it. We can hide or remove a game that breaks these rules, or that stops working, and we tell you why.",
        "You are responsible for your game and for the people who play it. We host it; we do not make it.",
      ],
    },
    {
      heading: "Coins and items",
      paragraphs: [
        "You earn coins and items by playing. They are part of the game, not money: they have no cash value, you cannot buy them with money or cash them out, and you cannot sell or transfer them.",
        "We may change what items cost, what you earn, and what the shop has, as the site grows.",
      ],
    },
    {
      heading: "What you must not do",
      paragraphs: [
        "Do not break the law, or ask anyone else to. Do not put on start.ng anything hateful, threatening, sexually explicit, or meant to shock or harm.",
        "Do not attack the site or other people on it: no viruses or harmful code, no trying to break in, no scraping or copying the site in bulk, no spam, no harassment, and no cheating the systems that hand out scores, coins or places.",
        "If you find a security problem, tell us at hello@start.ng rather than using it or posting it publicly.",
      ],
    },
    {
      heading: "start.ng's own content",
      paragraphs: [
        "The start.ng name, logo, design and the words we wrote belong to start.ng and the HNG community. You may link to any page, and you may quote a little of it, but do not copy the site to pass it off as your own.",
      ],
    },
    {
      heading: "Games from other places",
      paragraphs: [
        "Some games here are made and hosted by independent creators, on their own sites. Their own terms and privacy policies may apply while you play them, and they are responsible for those games. Tell us if one breaks these rules and we will look at it.",
      ],
    },
    {
      heading: "If something goes wrong",
      paragraphs: [
        "start.ng is free, and it is provided as it is. We work to keep it running, but we cannot promise it will always be available or free of faults, and we are not responsible for lost scores, coins, items or games.",
        "We are not liable for indirect losses, such as lost profits, lost data or lost opportunities, arising from your use of start.ng. Nothing in these terms limits any liability that the law does not allow us to limit.",
      ],
    },
    {
      heading: "Ending your account",
      paragraphs: [
        "You can ask us to close your account at any time by emailing hello@start.ng. We delete the account and the things that belong to it, as our [privacy policy](/privacy) describes.",
        "We can suspend or close an account that breaks these terms, or that we reasonably believe is being used to harm someone. Where we can, we tell you why and what you can do about it.",
      ],
    },
    {
      heading: "Changes to these terms",
      paragraphs: [
        "We may change these terms as start.ng grows. When we do, we change this page and the date at the top of it. If a change matters, we tell you the next time you sign in. Using start.ng after a change means you accept it.",
      ],
    },
    {
      heading: "Which law applies",
      paragraphs: [
        "These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Nigeria decide any dispute about them.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Questions about these terms: hello@start.ng. What we do with your information is on the [privacy policy](/privacy).",
      ],
    },
  ],
};

export const LEGAL: Record<"privacy" | "terms", LegalDoc> = { privacy: PRIVACY, terms: TERMS };
