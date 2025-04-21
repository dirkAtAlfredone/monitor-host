require('dotenv').config();

const ping = require('ping');
const fs = require('fs');
const nodemailer = require('nodemailer');

const GOOGLE_PASS = process.env.GOOGLE_PASS;

const hosts = [{
    name: "RICHMOND",
    host: '192.168.1.9'
}, {
    name: "BURNABY",
    host: '192.168.1.10'
}, {
    name: "LANGLEY",
    host: '192.168.1.11'
}, {
    name: "DAWSON",
    host: '192.168.1.12'
}, {
    name: "VICTORIA",
    host: '192.168.1.13'
},/*{
    name: "DIRKELSON",
    host: '192.168.1.14'
}*/, {
    name: "VANCOUVER",
    host: '192.168.1.15'
}, {
    name: "GATEWAY",
    host: "192.168.1.1"
}
];

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "dirk@alfredone.ca",
        pass: GOOGLE_PASS
    }
});

// interval is in ms
const interval = 60 * 1000;

const emptyLog = {
    "RICHMOND": [],
    "BURNABY": [],
    "LANGLEY": [],
    "DAWSON": [],
    "VICTORIA": [],
    "VANCOUVER": [],
    "GATEWAY": []
}

fs.writeFileSync("./log.json", JSON.stringify(emptyLog));

(async () => {
    const res = await ping.promise.probe(hosts[hosts.length - 1].host);
    console.log(res.alive);
})();

const checkHost = () => {

    hosts.forEach(async (server) => {
        try {
            const res = await ping.promise.probe(server.host);
            console.log(`[${new Date().toISOString()}] ${server.name} is ${res.alive ? "UP" : "DOWN"}`);
            const log = JSON.parse(fs.readFileSync("./log.json", "utf-8"));
            if (!res.alive) {
                const serverStatus = log[server.name];

                if (serverStatus.length) {
                    const lastStatus = serverStatus[serverStatus.length - 1];
                    if (lastStatus.isAlive !== res.alive) {
                        log[server.name].push({
                            date: new Date().toISOString(),
                            isAlive: res.alive
                        });
                        const mailOptions = {
                            from: "dirk@alfredone.ca",
                            to: "dbsl.vices@gmail.com",
                            subject: `Server Status`,
                            text: `${server.name} is ${res.alive ? "back UP" : "DOWN"} at ${new Date().toISOString()}`
                        }

                        transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                return console.log('Error sending email...', error);
                            }
                            console.log(`Email sent to ${info.response}`);
                        });

                        fs.writeFileSync("./log.json", JSON.stringify(log));
                    }
                }
                else {
                    log[server.name].push({
                        date: new Date().toISOString(),
                        isAlive: res.alive
                    });
                    const mailOptions = {
                        from: "dirk@alfredone.ca",
                        to: "dbsl.vices@gmail.com",
                        subject: `Server Status`,
                        text: `${server.name} is ${res.alive ? "back UP" : "DOWN"} at ${new Date().toISOString()}`
                    }

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            return console.log('Error sending email...', error);
                        }
                        console.log(`Email sent to ${info.response}`);
                    });
                    fs.writeFileSync("./log.json", JSON.stringify(log));
                }
            }
            else {
                const serverStatus = log[server.name];
                if (serverStatus.length) {
                    const lastStatus = serverStatus[serverStatus.length - 1];
                    if (lastStatus.isAlive !== res.alive) {
                        log[server.name].push({
                            date: new Date().toISOString(),
                            isAlive: res.alive
                        });
                        const mailOptions = {
                            from: "dirk@alfredone.ca",
                            to: "dbsl.vices@gmail.com",
                            subject: `Server Status`,
                            text: `${server.name} is ${res.alive ? "back UP" : "DOWN"} at ${new Date().toISOString()}`
                        }

                        transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                return console.log('Error sending email...', error);
                            }
                            console.log(`Email sent to ${info.response}`);
                        });
                        
                        fs.writeFileSync("./log.json", JSON.stringify(log));
                    }
                }
            }
        }
        catch (e) {
            
        }
    });
};

checkHost();

setInterval(checkHost, interval);