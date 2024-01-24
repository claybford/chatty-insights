/*The following is code for a node.js server application that serves as an interface 
between a client webpage and the OpenAI text generation API. The server should remember 
ongoing chats for 6 hours, after which it should discard them from memory. The client 
should be able to request to start a new chat conversation, end / delete a 
conversation, and send messages and recieve the responses to those messages. The client 
will be providing the chat id, so the server will only be responsible for clearing 
chats that are left in memory after 6 hours of inactivity. Includes error handling 
everywhere necessary to make sure the server doesn't crash, as it will be unmonitored.*/

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const cors = require('cors');

var corsOptions = {
    origin: 'https://chatclient.claytonbford.com',
    methods: "OPTIONS,POST",
    allowedHeaders: "Content-Type,Authorization"
};
app.use(cors(corsOptions));

app.use(bodyParser.json());

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = process.env.OPENAI_MODEL;

const chats = {};
const INACTIVITY_LIMIT = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.post('/start-chat', async (req, res) => {
    const { chatId } = req.body;
    if (!chatId) {
        console.log(`rejecting a request to start a chat recieved without a chatID ----------- [++!]`);
        return res.status(400).send('Missing chatId');
    }
    chats[chatId] = {
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        lastActivity: Date.now()
    };
    res.json({ message: `${chatId} started` });
    console.log(`${chatId} started ----------------------- [+++]`);
});

app.post('/send-message', async (req, res) => {
    const { chatId, message } = req.body;

    console.log(`${chatId} message request --------------- [>>*]`);

    if (!chatId && !message) {
        console.log(`rejecting a message request due to missing chatID and incoming message -- [>>!]`);
        return res.status(400).send('Missing chatId and message');
    }
    if (!chatId) {
        console.log(`rejecting a message request due to missing chatID ----------------------- [>>!]`);
        return res.status(400).send('Missing chatId');
    }
    if (!message) {
        console.log(`chat_cd2a1097-db0b-4075-9796-62987ad00061 rjctng msg rqst rcvd wo msg --- [>>!]`);
        return res.status(400).send('Missing message');
    }
    if (!chats[chatId]) {
        console.log(`${chatId} rjctng msg rqst w unkwn chtID - [>>!]`);
        return res.status(404).send('Chat not found');
    }

    chats[chatId].messages.push({ role: "user", content: message });

    try {
        const chatCompletion = await openai.chat.completions.create({
            messages: chats[chatId].messages,
            model: MODEL
        });

        if (!chats[chatId].chat_id) {
            chats[chatId].chat_id = chatCompletion.id;
        }

        const reply = chatCompletion.choices[0].message.content;
        chats[chatId].messages.push({ role: "assistant", content: reply });
        res.json({ reply });
        console.log(`${chatId} message sent ------------------ [*>>]`);
    } catch (error) {
        console.error(`${chatId} error sending message: -------- [!>>]\n${error}`);
        res.status(500).send('An error occurred');
    }

    chats[chatId].lastActivity = Date.now();
});

app.post('/clear-chat', (req, res) => {
    const { chatId } = req.body;
    if (!chatId) {
        console.log(`rejecting a request to clear a chat recieved without a chatID ----------- [--!]`);
        return res.status(400).json({ error: 'Missing chatId' });
    }
    if (chats[chatId]) {
        delete chats[chatId];
        console.log(`${chatId} cleared ----------------------- [---]`);
        res.json({ message: `${chatId} cleared [---]` });
    } else {
        console.error(`${chatId} rjctng clr rqst w unkwn chtID - [--!]`);
        res.status(404).json({ error: 'Chat not found' });
    }
});

function clearInactiveChats() {
    const now = Date.now();
    for (const chatId in chats) {
        if (now - chats[chatId].lastActivity > INACTIVITY_LIMIT) {
            delete chats[chatId];
            console.log(`${chatId} cleared due to inactivity ----- [~~~]`);
        }
    }
}

setInterval(clearInactiveChats, 60 * 60 * 1000); // Check every hour

const PORT = process.env.PORT;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[***********************] Server running on port ${PORT} [***********************]`);
});
