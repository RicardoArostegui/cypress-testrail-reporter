const chalk = require("chalk");
import { TestRailOptions, TestRailResult } from "./testrail.interface";

export class TestRail {
  private base: String;
  private runId: Number;
  private includeAll: Boolean = true;
  private caseIds: Number[] = [];
  private axios: any;

  constructor(private options: TestRailOptions) {
    console.log("Config===>", options);
    this.base = `${options.host}/index.php?/api/v2`;
    if (this.options.proxy) {
      const HttpsProxyAgent = require("https-proxy-agent");
      const axiosDefaultConfig = {
        proxy: false,
        httpsAgent: new HttpsProxyAgent(options.proxyUrl),
      };
      console.log("TestRail Reporter Through Proxy");
      this.axios = require("axios").create(axiosDefaultConfig);
    } else {
      console.log("TestRail Reporter Through Internet");
      this.axios = require("axios");
    }
  }

  public getCases() {
    let url = `${this.base}/get_cases/${this.options.projectId}&suite_id=${this.options.suiteId}`;
    if (this.options.groupId) {
      url += `&section_id=${this.options.groupId}`;
    }
    if (this.options.filter) {
      url += `&filter=${this.options.filter}`;
    }
    return this.axios({
      method: "get",
      url: url,
      headers: { "Content-Type": "application/json" },
      auth: {
        username: this.options.username,
        password: this.options.password,
      },
    })
      .then((response) => response.data.cases.map((item) => item.id))
      .catch((error) => console.error(error));
  }

  public async createRun(name: string, description: string) {
    if (this.options.includeAllInTestRun === false) {
      this.includeAll = false;
      this.caseIds = await this.getCases();
    }
    this.axios({
      method: "post",
      url: `${this.base}/add_run/${this.options.projectId}`,
      headers: { "Content-Type": "application/json" },
      auth: {
        username: this.options.username,
        password: this.options.password,
      },
      data: JSON.stringify({
        suite_id: this.options.suiteId,
        name,
        description,
        include_all: this.includeAll,
        case_ids: this.caseIds,
      }),
    })
      .then((response) => {
        this.runId = response.data.id;
      })
      .catch((error) => console.error(error));
  }

  public deleteRun() {
    this.axios({
      method: "post",
      url: `${this.base}/delete_run/${this.runId}`,
      headers: { "Content-Type": "application/json" },
      auth: {
        username: this.options.username,
        password: this.options.password,
      },
    }).catch((error) => console.error(error));
  }

  public publishResults(results: TestRailResult[]) {
    return this.axios({
      method: "post",
      url: `${this.base}/add_results_for_cases/${this.runId}`,
      headers: { "Content-Type": "application/json" },
      auth: {
        username: this.options.username,
        password: this.options.password,
      },
      data: JSON.stringify({ results }),
    })
      .then((response) => {
        console.log("\n", chalk.magenta.underline.bold("(TestRail Reporter)"));
        console.log(
          "\n",
          ` - Results are published to ${chalk.magenta(
            `${this.options.host}/index.php?/runs/view/${this.runId}`
          )}`,
          "\n"
        );
      })
      .catch((error) => console.error(error));
  }

  public closeRun() {
    this.axios({
      method: "post",
      url: `${this.base}/close_run/${this.runId}`,
      headers: { "Content-Type": "application/json" },
      auth: {
        username: this.options.username,
        password: this.options.password,
      },
    })
      .then(() => console.log("- Test run closed successfully"))
      .catch((error) => console.error(error));
  }
}
