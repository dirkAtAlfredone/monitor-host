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
    to: "dirk@alfredone.ca, bruce@alfredone.ca, caroline@alfredone.ca, isabelle@alfredone.ca",
    subject: `Server Status Changed (Testing if it works)`,
    html: ``
}

// transporter.sendMail(mailOptions, (error, info) => {
//     if (error) {
//         return console.log('Error sending email...', error);
//     }
//     console.log(`Email sent to ${info.response}`);
// });

const hosts = [{
    name: "RICHMOND",
    host: '192.168.1.9'
}, {
    name: "BURNABY",
    host: '192.168.1.10'
},{
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
    name: "CACHE-CREEK",
    host: "192.168.1.248"
}, {
    name: "NANAIMO",
    host: "192.168.1.249"
}, {
    name: "SURREY",
    host: "192.168.1.250"
}, {
    name: "UISP",
    host: "192.168.1.240"
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
}
];

// interval is in ms
const interval = 60 * 1000;

const emptyLog = (() => {
    const serverLogs = {};

    hosts.forEach(host => {
        serverLogs[host.name] = [];
    });

    return serverLogs;
})();

fs.writeFileSync("./log.json", JSON.stringify(emptyLog));

const checkHost = async () => {
    console.log("Servers pinged...");
    const pings = hosts.map(async (server) => {
        // try{
            return await ping.promise.probe(server.host);
        // }
        // catch(e){
            // return await new Promise((resolve, reject) => {
        //         resolve({
        //             alive: false,
        //             host: server.name
        //         });
        //     });
        // }
    });

    const settled = await Promise.allSettled(pings).then(responses => responses.map(response => {
        const find = hosts.find(host => host.host === response?.value?.host);
        if(find){
            return {
                alive: response?.value?.alive,
                host: response?.value?.host,
                name: find.name,
                ip: find.host
            }
        }
        else {

            return {
                alive: response?.value?.alive,
                host: response?.value?.host,
                name: "",
                ip: ""
            }
        }
    }));

    const reduced = settled.reduce((prev, current) => {
        const log = JSON.parse(fs.readFileSync("./log.json", "utf-8"));
        const serverLog = log[current.name];
        const lastLog = serverLog[serverLog.length - 1] || {isAlive: true, date: new Date().toISOString()};
        let isSend = false;
        let tempHosts = [...prev.hosts];
        if(lastLog.isAlive !== current.alive){
            isSend = true;
            tempHosts.push({
                serverName: current.name,
                isAlive: current.alive,
                date: new Date().toISOString(),
                hasChanged: true,
                ip: current.ip
            });
            log[current.name].push({
                isAlive: current.alive,
                date: new Date().toISOString(),
                host: current.ip
            })
            fs.writeFileSync("./log.json", JSON.stringify(log));
        } else {
            tempHosts.push({
                serverName: current.name,
                isAlive: current.alive,
                date: new Date().toISOString(),
                hasChanged: false,
                ip: current.ip
            });
        }

        return {
            isSend: prev.isSend || isSend,
            hosts: tempHosts
        }
    }, {isSend: false, hosts:[]});

    if(reduced.isSend){

    let partial = ``;
    
    for(let ho of reduced.hosts){
        partial += `<tr>
                <th scope="row">${ho.serverName}</th>
                <td>${ho.ip}</td>
                <td style="background-color:${ho.isAlive ? "#82E06E" : "#c9363e"};">${ho.isAlive ? "Online" : "Offline"}${ho.hasChanged ? "*" : ""}</td>
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
    }
    // for(let server of settled){
    //     console.log(`[${new Date().toISOString()}] ${server.name} is ${server.alive ? "UP" : "DOWN"}`);
    //     const log = JSON.parse(fs.readFileSync("./log.json", "utf-8"));
    //     if (!server.alive) {
    //         const serverStatus = log[server.name];

    //         if (serverStatus.length) {
    //             const lastStatus = serverStatus[serverStatus.length - 1];
    //             if (lastStatus.isAlive !== server.alive) {
    //                 log[server.name].push({
    //                     date: new Date().toISOString(),
    //                     isAlive: res.alive
    //                 });
    //             }
    //         }
    //     }
    // }

    // hosts.forEach(async (server) => {
    //     try {
    //         const res = await ping.promise.probe(server.host);
    //         console.log(`[${new Date().toISOString()}] ${server.name} is ${res.alive ? "UP" : "DOWN"}`);
    //         const log = JSON.parse(fs.readFileSync("./log.json", "utf-8"));
    //         if (!res.alive) {
    //             const serverStatus = log[server.name];

    //             if (serverStatus.length) {
    //                 const lastStatus = serverStatus[serverStatus.length - 1];
    //                 if (lastStatus.isAlive !== res.alive) {
    //                     log[server.name].push({
    //                         date: new Date().toISOString(),
    //                         isAlive: res.alive
    //                     });
    //                     const mailOptions = {
    //                         from: "dirk@alfredone.ca",
    //                         to: "support@alfredone.ca, dirk@alfredone.ca",
    //                         subject: `Server Status`,
    //                         text: `${server.name} is ${res.alive ? "back UP" : "DOWN"} at ${new Date().toISOString()}`
    //                     }

    //                     transporter.sendMail(mailOptions, (error, info) => {
    //                         if (error) {
    //                             return console.log('Error sending email...', error);
    //                         }
    //                         console.log(`Email sent to ${info.response}`);
    //                     });

    //                     fs.writeFileSync("./log.json", JSON.stringify(log));
    //                 }
    //             }
    //             else {
    //                 log[server.name].push({
    //                     date: new Date().toISOString(),
    //                     isAlive: res.alive
    //                 });
    //                 const mailOptions = {
    //                     from: "dirk@alfredone.ca",
    //                     to: "support@alfredone.ca, dirk@alfredone.ca",
    //                     subject: `Server Status`,
    //                     text: `${server.name} is ${res.alive ? "back UP" : "DOWN"} at ${new Date().toISOString()}`
    //                 }

    //                 transporter.sendMail(mailOptions, (error, info) => {
    //                     if (error) {
    //                         return console.log('Error sending email...', error);
    //                     }
    //                     console.log(`Email sent to ${info.response}`);
    //                 });

    //                 fs.writeFileSync("./log.json", JSON.stringify(log));
    //             }
    //         }
    //         else {
    //             const serverStatus = log[server.name];
    //             if (serverStatus.length) {
    //                 const lastStatus = serverStatus[serverStatus.length - 1];
    //                 if (lastStatus.isAlive !== res.alive) {
    //                     log[server.name].push({
    //                         date: new Date().toISOString(),
    //                         isAlive: res.alive
    //                     });
    //                     const mailOptions = {
    //                         from: "dirk@alfredone.ca",
    //                         to: "support@alfredone.ca, dirk@alfredone.ca",
    //                         subject: `Server Status`,
    //                         text: `${server.name} is ${res.alive ? "back UP" : "DOWN"} at ${new Date().toISOString()}`
    //                     }

    //                     transporter.sendMail(mailOptions, (error, info) => {
    //                         if (error) {
    //                             return console.log('Error sending email...', error);
    //                         }
    //                         console.log(`Email sent to ${info.response}`);
    //                     });
                        
    //                     fs.writeFileSync("./log.json", JSON.stringify(log));
    //                 }
    //             }
    //         }
    //     }
    //     catch (e) {
    //         console.log(e);
    //     }
    // });
};

checkHost();

setInterval(checkHost, interval);