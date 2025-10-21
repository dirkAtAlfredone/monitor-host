require('dotenv').config();

const ping = require('ping');
const fs = require('fs');
const nodemailer = require('nodemailer');

const PASS = process.env.PASS;

const d = new Date();

const dateString = d.getFullYear()+"-"+(d.getMonth()+1).toString().padStart(2,0)+"-"+d.getDate().toString().padStart(2,0)+"_"+d.getHours().toString().padStart(2,0)+":"+d.getMinutes().toString().padStart(2,0)+":"+d.getSeconds().toString().padStart(2,0);

const transporter = nodemailer.createTransport({
  host: "mail.alfredone.ca",
  secure: true,
  auth: {
    user: "noreply@alfredone.ca",
    pass: PASS
  }
});

const mailOptions = {
  from: "noreply@alfredone.ca",
  to: "dirk@alfredone.ca, bruce@alfredone.ca",
  subject: `Server Status Changed`,
  html: ``
}

let sendFlag = false;

let changeList = [];

const hosts = [{
  name: "RICHMOND",
  host: '192.168.1.9'
}, {
  name: "BURNABY",
  host: '192.168.1.10'
}, {
  name: "DAWSON",
  host: '192.168.1.12'
}, {
  name: "VANCOUVER",
  host: '192.168.1.15'
}, {
  name: "GATEWAY",
  host: "192.168.1.1"
}, {
  name: "NELSON",
  host: "192.168.1.13"
}, {
  name: "STANLEY",
  host: "192.168.1.247"
}, {
  name: "CACHECREEK",
  host: "192.168.1.248"
}, {
  name: "NANAIMO",
  host: "192.168.1.249"
}, {
  name: "SURREY",
  host: "192.168.1.250"
}, {
  name: "COQUITLAM",
  host: "192.168.1.245"
}, {
  name: "NEWWEST",
  host: "192.168.1.246"
}, {
  name: "AP01",
  host: "192.168.1.231"
}, {
  name: "AP02",
  host: "192.168.1.232"
}, {
  name: "AP03",
  host: "192.168.1.233"
}, {
  name: "COMOX",
  host: "192.168.1.3"
}, {
  name: "WHITEROCK",
  host: "192.168.1.4"
}, {
  name: "KAMLOOPS",
  host: "192.168.1.20"
}, {
  name: "KELOWNA",
  host: "192.168.1.21"
}, {
  name: "GOLDEN",
  host: "192.168.1.22"
}, {
  name: "REVELSTOKE",
  host: "192.168.1.23"
}, {
  name: "YYJ",
  host: "192.168.1.204"
}, {
  name: "YVR",
  host: "192.168.1.213"
}, {
  name: "YYC",
  host: "192.168.1.206"
}, {
  name: "YEG",
  host: "192.168.1.214"
}, {
  name: "YWG",
  host: "192.168.1.212"
}, {
  name: "YYZ",
  host: "192.168.1.209"
}, {
  name: "YUL",
  host: "192.168.1.210"
}, {
  name: "YHZ",
  host: "192.168.1.211"
}, {
  name: "LHR",
  host: "192.168.1.220"
}, {
  name: "CDG",
  host: "192.168.1.221"
}, {
  name: "ZUR",
  host: "192.168.1.222"
}, {
  name: "NRT",
  host: "192.168.1.223"
}
];

// interval is in ms
const interval = 60 * 1000;

let FAIL_LOG = [];
const FAIL_LOG_NAME = `fail_log_${dateString}`;
const LOG_NAME = `log_${dateString}`;

fs.writeFileSync(`${FAIL_LOG_NAME}`, "[]");

const log = (() => {
  const serverLogs = {};

  hosts.forEach(host => {
    serverLogs[host.name] = { log: [], count: 0, ip: host.host, state: "unreachable" };
  });

  return serverLogs;
})();

fs.writeFileSync(`${LOG_NAME}`, JSON.stringify(log));

const checkHost = async () => {
  console.log("Servers pinged...");
    const pings = hosts.map(async (server) => {
    return await ping.promise.probe(server.host, { min_reply: 10 });
  });

  const settled = await Promise.allSettled(pings).then(responses => responses.map(response => {
    const find = hosts.find(host => host.host === response?.value?.host);
    if (find) {
      return {
        isFound: true,
        alive: response?.value?.alive,
        host: response?.value?.host,
        name: find.name,
        ip: find.host,
        response: response.value
      }
    }
    else {

      return {
        isFound: false,
        alive: response?.value?.alive,
        host: response?.value?.host,
        name: "",
        ip: "",
        response: response.value
      }
    }
  }));

  let tempFail = [];

  for (const ping of settled) {

    if(!ping.alive){
      const newFailLog = {
        name: ping.name,
        date: new Date().toLocaleDateString(),
        response: ping.response
      }
      tempFail.push(newFailLog);
    }

    if (!log[ping.name]?.log?.length) {
      const newLog = {
        date: new Date().toISOString(),
        isAlive: ping.alive
      }
      log[ping.name].state = ping.alive ? "reachable" : "unreachable";
      log[ping.name].log.push(newLog);

      if(log[ping.name].state === "reachable"){
        log[ping.name].count = 3;
      }
      else {
        log[ping.name].count = 1;
      }
    } else {
      const lastLog = log[ping.name].log[log[ping.name].log.length - 1];
      if (lastLog.isAlive !== ping.alive) {
        const newLog = {
          date: new Date().toISOString(),
          isAlive: ping.alive
        };
        log[ping.name].state = ping.alive ? "reachable" : "unreachable";
        log[ping.name].count = 1;
        log[ping.name].log.push(newLog);
      } else {
          log[ping.name].count++;
      }
    }
    if(log[ping.name].state === "reachable" && log[ping.name].count === 2){
      sendFlag = true;
      changeList.push(ping.name);
    }
    else if(log[ping.name].state === "unreachable" && log[ping.name].count === 5){
      sendFlag = true;
      changeList.push(ping.name);
    }
  }

  fs.writeFileSync(`${LOG_NAME}`, JSON.stringify(log));

  if(tempFail.length){
    const previousFailJSON = fs.readFileSync(FAIL_LOG_NAME);
    const previousFail = JSON.parse(previousFailJSON);
    const merged = previousFail.concat(tempFail);
    fs.writeFileSync(FAIL_LOG_NAME, JSON.stringify(merged));
  }

  if (sendFlag) {
    console.log("message sent...");
    let partial = ``;

    for (let ho of hosts) {
      const host = log[ho.name];
      partial += `<tr>
                <th scope="row">${ho.name}</th>
                <td>${ho.host}</td>
                <td style="background-color:${host.state === "reachable" ? "#82E06E" : "#c9363e"};">${host.state === "reachable" ? "Online" : "Offline"}${changeList.includes(ho.name) ? "*" : ""}</td>
                </tr>`
    }
    const tempHtml = `
            <style>
                table{
                    width: 100%;
                    border-collapse: collapse;
                }
                th, td{
                    border: 1px solid #dddddd;
                }
                tr:nth-child(even) {
                    background-color: #dddddd;
                }
                h1{
                    text-align: center;
                }
                caption{
                    text-align: center;
                }
            </style>
            <h1>Server Status Summary</h1>
            <table>
            <caption>Status marked with * means status has changed since last update</caption>
            <thead>
                <tr>
                <th scope="col">Host</th>
                <th scope="col">IP Address</th>
                <th scope="col">Status</th>
                </tr>
            </thead>
            <tbody>
                ${partial}
            </tbody>
            </table>
        `;

    mailOptions.html = tempHtml;

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log('Error sending email...', error);
      }
      console.log(`Email sent to ${info.response}`);
    });

    sendFlag = false;
    changeList = [];
  }

};

checkHost();

setInterval(checkHost, interval);