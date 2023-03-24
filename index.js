const express = require("express");
const Queue = require('bull');
const myJobQueue = new Queue("WAWEB", "redis://127.0.0.1:6379");

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

        await myJobQueue.add({ mobile_no_string, message });

        return res.status(202).json({ "description": "Job in queue !" });

    } catch (err) {
        console.error(err)
        return res.status(500).json({ "description": "Internal Server Error" })
    }

    return res.status(500).json({ "description": "Uh Oh!" })
});

app.listen(port, () => {
    console.log(`app listening on port ${port}`);
});