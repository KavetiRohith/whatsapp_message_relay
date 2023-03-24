const qrcode = require("qrcode-terminal");
const express = require("express");
const { Client, LocalAuth, MessageAck } = require("whatsapp-web.js");

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ["--no-sandbox"],
        headless: true,
    },
});

client.on("loading_screen", (percent, message) => {
    console.log("LOADING SCREEN", percent, message);
});

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
    console.log("AUTHENTICATED");
});

client.on("auth_failure", (msg) => {
    console.error("AUTHENTICATION FAILURE", msg);
});

client.on("ready", () => {
    console.log("Client is ready!");
});

client.on("disconnected", (reason) => {
    console.log("Client was logged out", reason);
    client.initialize();
});

client.initialize();

process.on("SIGINT", async () => {
    console.log("Received SIGINT Shutting down...");
    await client.destroy();
    process.exit(0);
});

async function sendWhatsAppMessage(client, mobile_no_string, message) {
    try {
        const isRegistered = await client.isRegisteredUser(mobile_no_string);

        if (isRegistered) {
            const sendMessageData = await client.sendMessage(mobile_no_string, message);
            if (sendMessageData.ack != MessageAck.ACK_ERROR) {
                console.log(`Sent Message Whatsapp for Mobile: ${mobile_no_string} Message: ${message}`)
            } else {
                console.log(`Received Error: ${sendMessageData.ack.toString()} Acknowledgement while sending ${message} to ${mobile_no_string}`)
            }

        } else {
            console.log(`No Whatsapp User with Mobile number ${mobile_no} unable to send Message: ${message}`)
        }
    } catch (err) {
        console.log(`Unable to send Message: ${message} to Mobile number ${mobile_no}`)
        console.error(err)
    }
}

const app = express();
const port = process.env.WHATSAPP_GATEWAY_PORT | 3676;

app.use(express.json());

app.post("/", async (req, res) => {
    try {
        const message = req.body.message;
        const mobile_no = req.body.mobile_no;

        if (message == null || mobile_no == null) {
            return res.status(400).json({ "description": "message and mobile_no must be non null" });
        }

        let mobile_no_string = mobile_no.toString();

        if (mobile_no_string.startsWith("+91") && mobile_no_string.length == 13) {
            mobile_no_string = mobile_no_string.substring(1) + "@c.us";
        } else if (mobile_no_string.length == 10) {
            mobile_no_string = "91" + mobile_no_string + "@c.us";
        } else {
            return res.status(400).json({ "description": "Invalid Mobile Number" });
        }

        await sendWhatsAppMessage(client, mobile_no_string, message)

        return res.status(202).json({ "description": "OK" })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ "description": "Internal Server Error" })
    }

    return res.status(500).json({ "description": "Uh Oh!" })
});

app.listen(port, () => {
    console.log(`app listening on port ${port}`);
});