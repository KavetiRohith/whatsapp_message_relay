const Queue = require('bull');
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth, MessageAck } = require("whatsapp-web.js");

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ["--no-sandbox"],
        headless: true,
    },
});

const myJobQueue = new Queue("WAWEB", "redis://127.0.0.1:6379");
// await myJobQueue.pause()

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

client.on("ready", async () => {
    console.log("Client is ready!");
    await myJobQueue.resume()
});

client.on("disconnected", async (reason) => {
    console.log("Client was logged out", reason);
    await myJobQueue.pause()
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

myJobQueue.process(async (job) => {
    console.log(job.data)
    await sendWhatsAppMessage(client, job.data.mobile_no_string, job.data.message)
})
