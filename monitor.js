require('dotenv').config();

const ping = require('ping');
const fs = require('fs');
const nodemailer = require('nodemailer');

const PASS = process.env.PASS;

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
  to: "dirk@alfredone.ca",
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
}, {
  name: "TEST",
  host: "192.168.1.216"
}
];

// interval is in ms
const interval = 60 * 1000;

const log = (() => {
  const serverLogs = {};

  hosts.forEach(host => {
    serverLogs[host.name] = { log: [], count: 0, ip: host.host, state: "unreachable" };
  });

  return serverLogs;
})();

fs.writeFileSync("./log.json", JSON.stringify(log));

const checkHost = async () => {
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
        ip: find.host
      }
    }
    else {

      return {
        isFound: false,
        alive: response?.value?.alive,
        host: response?.value?.host,
        name: "",
        ip: ""
      }
    }
  }));

  for (const ping of settled) {
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

        fs.writeFileSync("./log.json", JSON.stringify(log));
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
  console.log(log);
  // const reduced = settled.reduce((prev, current) => {
  //   const serverStat = log[current.name];
  //   const serverLog = serverStat.log || [];
  //   const lastLog = serverLog[serverLog.length - 1] || { isAlive: true, date: new Date().toISOString() };
  //   let isSend = false;
  //   let tempHosts = [...prev.hosts];

  //   if (!current.alive) {
  //     log[current.name].lostCount = log[current.name].lostCount + 1;
  //     console.log("got to not alive", log[current.name].lostCount)
  //   } else {
  //     log[current.name].lostCount = 0;
  //   }

  //   if (lastLog.isAlive !== current.alive) {
  //     console.log()
  //     if (!current.alive) {
  //       if (log[current.name].lostCount >= 5) {
  //         isSend = true;
  //       }
  //     } else {
  //       isSend = true;
  //     }
  //     tempHosts.push({
  //       serverName: current.name,
  //       isAlive: current.alive,
  //       date: new Date().toISOString(),
  //       hasChanged: true,
  //       ip: current.ip
  //     });
  //     log[current.name].log.push({
  //       isAlive: current.alive,
  //       date: new Date().toISOString(),
  //       host: current.ip
  //     })
  //     console.log(log);
  //     fs.writeFileSync("./log.json", JSON.stringify(log));
  //   } else {
  //     tempHosts.push({
  //       serverName: current.name,
  //       isAlive: current.alive,
  //       date: new Date().toISOString(),
  //       hasChanged: false,
  //       ip: current.ip
  //     });
  //   }

  //   return {
  //     isSend: prev.isSend || isSend,
  //     hosts: tempHosts
  //   }
  // }, { isSend: false, hosts: [] });

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